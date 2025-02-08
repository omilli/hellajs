import { REACTIVE_STATE } from "./global";
import {
  Signal,
  StoreSignals,
  StoreEffect,
  StoreEffectTarget,
  StoreOptions,
  StoreState,
  StoreInternals,
} from "./types";
import { signal, batchSignals, immutable } from "./signal";
import { effect } from "./effect";

const { stores } = REACTIVE_STATE;

// Creates a reactive store with computed state and methods
export function store<T extends Record<string, any>>(
  factory: (store: StoreSignals<T>) => T,
  options: StoreOptions = {}
) {
  const internalStore = {
    signals: new Map(),
    methods: new Map(),
    readonly: new Set(options.readonly === true ? [] : options.readonly || []),
    effects: new Set(),
    isDisposed: false,
  } as StoreInternals<T>;

  const trackedEffect = (fn: () => void) => {
    const cleanup = effect(fn);
    internalStore.effects.add(cleanup);
    return cleanup;
  };

  internalStore.methods.set("effect", trackedEffect);
  const storeProxy = createStoreProxy(internalStore);

  const internalStoreFactory = factory(storeProxy);
  options.readonly === true &&
    (internalStore.readonly = new Set(Object.keys(internalStoreFactory)));
  const allowInternalMutations = !options.readonly || options.internalMutable;

  Object.entries(internalStoreFactory).forEach(([key, value]) => {
    if (typeof value === "function") {
      internalStore.methods.set(key, value);
      return;
    }
    internalStore.signals.set(
      key,
      internalStore.readonly.has(key)
        ? immutable(key, value)
        : createValidatedSignal(
            key,
            value,
            internalStore.readonly,
            allowInternalMutations || true,
            internalStore,
            storeProxy
          )
    );
  });

  const storeResult = {
    ...Object.fromEntries(internalStore.methods.entries()),
    ...Object.fromEntries(internalStore.signals.entries()),
    set: (update: Parameters<typeof processStoreUpdate<T>>[2]) =>
      processStoreUpdate(internalStore, internalStore.signals, update),
    cleanup: () => cleanupStore(storeResult, internalStore),
  } as StoreSignals<T>;

  stores.set(storeResult, {
    store: new Set(),
    effects: internalStore.effects,
  });

  return storeResult;
}

// Attaches effects to store properties for reactive updates
export function storeEffect<T extends Record<string, any>>(
  target: StoreEffectTarget<T>,
  effectFn: StoreEffect
) {
  return Array.isArray(target)
    ? handleTargetedEffect(
        target[0],
        target.slice(1) as Array<keyof StoreState<T>>,
        effectFn
      )
    : handleStoreEffect(target, effectFn);
}

// Processes batch updates to store signals
function processStoreUpdate<T>(
  internalStore: StoreInternals<T>,
  signals: Map<keyof T, Signal<any>>,
  update:
    | Partial<StoreState<T>>
    | ((store: StoreSignals<T>) => Partial<StoreState<T>>)
) {
  internalStore.isDisposed &&
    console.warn("Attempting to update a disposed store");
  batchSignals(() => {
    const currentState = Object.fromEntries(
      Array.from(signals.entries()).map(([key, sig]) => [key, sig])
    ) as StoreSignals<T>;
    const updates =
      typeof update === "function" ? update(currentState) : update;
    Object.entries(updates).forEach(([key, value]) => {
      if (internalStore.readonly.has(key)) {
        console.warn(`Skipping readonly property: ${key}`);
        return;
      }
      signals.get(key as keyof T)?.set(value);
    });
  });
}

// Handles effects targeting specific store properties
function handleTargetedEffect<T>(
  store: StoreSignals<T>,
  keys: Array<keyof StoreState<T>>,
  effectFn: StoreEffect
) {
  const watchedKeys = new Set(keys);
  keys.forEach((key) => {
    const signalValue = (store as any)[key];
    if (signalValue?.()) effectFn(key, signalValue());
  });
  const effect = createStoreEffect<T>(watchedKeys, effectFn);
  return setupEffectCollection(store, effect);
}

// Handles effects for the entire store
function handleStoreEffect<T>(store: StoreSignals<T>, effectFn: StoreEffect) {
  Object.keys(store).forEach((key) => {
    const signalValue = (store as any)[key];
    typeof signalValue === "function" &&
      signalValue() &&
      effectFn(key, signalValue());
  });
  return setupEffectCollection(store, effectFn);
}

// Creates a validated signal with readonly and mutation checks
function createValidatedSignal<T, V>(
  key: keyof T,
  value: V,
  readonly: Set<string>,
  allowInternalMutations: boolean,
  internalStore: StoreInternals<T>,
  storeProxy: object
): Signal<V> {
  const sig = signal(value);
  return new Proxy(sig, {
    get(target, prop) {
      if (prop !== "set") return (target as any)[prop];
      return (...args: [V]) => {
        if (internalStore.isDisposed) {
          console.warn(
            `Attempting to update a disposed store signal: ${String(key)}`
          );
          return;
        }
        const isInternalCall = new Error().stack?.includes(
          "internalStoreFactory"
        );
        if (
          readonly.has(String(key)) &&
          (!allowInternalMutations || !isInternalCall)
        ) {
          console.warn(`Cannot modify readonly property: ${String(key)}`);
          return;
        }
        const result = target.set(...args);
        stores.get(storeProxy)?.store?.forEach((cb) => cb(key, args[0]));
        return result;
      };
    },
  }) as Signal<V>;
}

// Creates a proxy for store access and validation
function createStoreProxy<T>(
  internalStore: StoreInternals<T>
): StoreSignals<T> {
  return new Proxy({} as StoreSignals<T>, {
    get(_target, prop: string | symbol) {
      const key = prop as keyof T;
      if (key === "effect")
        return internalStore.methods.get("effect" as keyof T);
      if (internalStore.signals.has(key)) return internalStore.signals.get(key);
      if (internalStore.methods.has(key)) return internalStore.methods.get(key);
      throw new Error(`Accessing undefined store property: ${String(prop)}`);
    },
  });
}

// Creates an effect function for specific store keys
function createStoreEffect<T>(keys: Set<string>, effectFn: StoreEffect) {
  return (key: keyof any, value: any) => {
    if (keys.has(key as string)) {
      effectFn(key as keyof StoreState<T>, value);
    }
  };
}

// Sets up effect collection and cleanup for store subscriptions
function setupEffectCollection(store: object, effect: StoreEffect) {
  const storeData = stores.get(store);
  if (!storeData) {
    stores.set(store, {
      store: new Set([effect]),
      effects: new Set(),
    });
    return () => stores.get(store)?.store.delete(effect);
  }
  storeData.store.add(effect);
  return () => storeData.store.delete(effect);
}

// Cleans up store resources and removes references
function cleanupStore<T>(
  store: StoreSignals<T>,
  internalStore: StoreInternals<T>
): void {
  internalStore.isDisposed = true;
  const storeData = stores.get(store);
  if (storeData) {
    storeData.store.clear();
    storeData.effects.forEach((cleanup) => cleanup());
    stores.delete(store);
  }
  internalStore.signals.forEach((signal) => signal.dispose?.());
  internalStore.effects.clear();
  internalStore.signals.clear();
  internalStore.methods.clear();
  internalStore.readonly.clear();
}
