import { REACTIVE_STATE } from "../global";
import {
  Signal,
  StoreSignals,
  StoreEffect,
  StoreEffectTarget,
  StoreOptions,
  StoreState,
  StoreInternals,
} from "../types";
import { signal, batchSignals, immutable } from "./signal";

export function store<T extends Record<string, any>>(
  factory: (store: StoreSignals<T>) => T,
  options: StoreOptions = {}
) {
  const impl = createStoreImplementation<T>(options);
  const storeProxy = createStoreProxy(impl);
  const implementation = factory(storeProxy);

  if (options.readonly === true) {
    impl.readonly = new Set(Object.keys(implementation));
  }

  const allowInternalMutations = !options.readonly || options.internalMutable;

  Object.entries(implementation).forEach(([key, value]) => {
    if (typeof value === "function") {
      impl.methods.set(key, value);
    } else {
      impl.signals.set(
        key,
        impl.readonly.has(key)
          ? immutable(key, value)
          : createValidatedSignal(
              key,
              value,
              impl.readonly,
              allowInternalMutations || true,
              storeProxy
            )
      );
    }
  });

  const storeResult = {
    ...Object.fromEntries(impl.methods.entries()),
    ...Object.fromEntries(impl.signals.entries()),
    set: (update: Parameters<typeof processStoreUpdate<T>>[2]) =>
      processStoreUpdate(impl, impl.signals, update),
  } as StoreSignals<T>;

  REACTIVE_STATE.storeEffects.set(storeResult, new Set());
  return storeResult;
}

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

function createValidatedSignal<T, V>(
  key: keyof T,
  value: V,
  readonly: Set<string>,
  allowInternalMutations: boolean,
  storeResult: object
): Signal<V> {
  const sig = signal(value);

  return new Proxy(sig, {
    get(target, prop) {
      if (prop !== "set") return (target as any)[prop];

      return (...args: [V]) => {
        const isInternalCall = new Error().stack?.includes("implementation");
        if (
          readonly.has(String(key)) &&
          (!allowInternalMutations || !isInternalCall)
        ) {
          console.warn(`Cannot modify readonly property: ${String(key)}`);
          return;
        }

        const result = target.set(...args);
        REACTIVE_STATE.storeEffects
          .get(storeResult)
          ?.forEach((cb) => cb(key, args[0]));
        return result;
      };
    },
  }) as Signal<V>;
}

function createStoreImplementation<T>(
  options: StoreOptions
): StoreInternals<T> {
  return {
    signals: new Map(),
    methods: new Map(),
    readonly: new Set(options.readonly === true ? [] : options.readonly || []),
  };
}

function createStoreProxy<T>(impl: StoreInternals<T>): StoreSignals<T> {
  return new Proxy({} as StoreSignals<T>, {
    get(_target, prop: string | symbol) {
      const key = prop as keyof T;
      if (impl.signals.has(key)) return impl.signals.get(key);
      if (impl.methods.has(key)) return impl.methods.get(key);
      throw new Error(`Accessing undefined store property: ${String(prop)}`);
    },
  });
}

function createStoreEffect<T>(keys: Set<string>, effectFn: StoreEffect) {
  return (key: keyof any, value: any) => {
    if (keys.has(key as string)) {
      effectFn(key as keyof StoreState<T>, value);
    }
  };
}

function setupEffectCollection(store: object, effect: StoreEffect) {
  if (!REACTIVE_STATE.storeEffects.has(store)) {
    REACTIVE_STATE.storeEffects.set(store, new Set());
  }
  REACTIVE_STATE.storeEffects.get(store)?.add(effect);
  return () => REACTIVE_STATE.storeEffects.get(store)?.delete(effect);
}

function processStoreUpdate<T>(
  impl: StoreInternals<T>,
  signals: Map<keyof T, Signal<any>>,
  update:
    | Partial<StoreState<T>>
    | ((store: StoreSignals<T>) => Partial<StoreState<T>>)
) {
  batchSignals(() => {
    const currentState = Object.fromEntries(
      Array.from(signals.entries()).map(([key, sig]) => [key, sig])
    ) as StoreSignals<T>;

    const updates =
      typeof update === "function" ? update(currentState) : update;

    Object.entries(updates).forEach(([key, value]) => {
      if (impl.readonly.has(key)) {
        console.warn(`Skipping readonly property: ${key}`);
        return;
      }
      signals.get(key as keyof T)?.set(value);
    });
  });
}

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

function handleStoreEffect<T>(store: StoreSignals<T>, effectFn: StoreEffect) {
  Object.keys(store).forEach((key) => {
    const signalValue = (store as any)[key];
    if (typeof signalValue === "function" && signalValue()) {
      effectFn(key, signalValue());
    }
  });

  return setupEffectCollection(store, effectFn);
}
