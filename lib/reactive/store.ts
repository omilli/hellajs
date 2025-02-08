import { REACTIVE_STATE } from "./global";
import {
  Signal,
  StoreSignals,
  StoreEffect,
  StoreEffectTarget,
  StoreState,
  StoreInternals,
  StoreEffectFn,
} from "./types";
import { signal, batchSignals } from "./signal";
import { effect } from "./effect";
import { isFunction } from "../global";

const { stores } = REACTIVE_STATE;

export function store<T extends Record<string, any>>(
  factory: (store: StoreSignals<T>) => T
) {
  const internalStore: StoreInternals<T> = {
    signals: new Map(),
    methods: new Map(),
    effects: new Set(),
    isDisposed: false,
  };

  const trackedEffect: StoreEffectFn = (fn) => {
    const cleanup = effect(fn);
    internalStore.effects.add(cleanup);
    return cleanup;
  };

  const storeProxy = createStoreProxy(internalStore);
  internalStore.methods.set("effect", trackedEffect);

  const storeEntries = Object.entries(factory(storeProxy));
  for (const [key, value] of storeEntries) {
    isFunction(value)
      ? internalStore.methods.set(key, value)
      : internalStore.signals.set(
          key,
          createValidatedSignal(key, value, internalStore, storeProxy)
        );
  }

  const storeResult = createStoreResult(internalStore);
  stores.set(storeResult, { store: new Set(), effects: internalStore.effects });
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

function processStoreUpdate<T>(
  internalStore: StoreInternals<T>,
  signals: Map<keyof T, Signal<any>>,
  update:
    | Partial<StoreState<T>>
    | ((store: StoreSignals<T>) => Partial<StoreState<T>>)
) {
  internalStore.isDisposed &&
    console.warn("Attempting to update a disposed store");
  const updates = isFunction(update)
    ? update(Object.fromEntries(signals) as unknown as StoreSignals<T>)
    : update;

  batchSignals(() => {
    for (const [key, value] of Object.entries(updates)) {
      signals.get(key as keyof T)?.set(value);
    }
  });
}

function handleTargetedEffect<T>(
  store: StoreSignals<T>,
  keys: Array<keyof StoreState<T>>,
  effectFn: StoreEffect
) {
  const watchedKeys = new Set(keys);
  const signalValues = keys.map((key) => [key, (store as any)[key]]);
  signalValues.forEach(
    ([key, signal]) => signal?.() && effectFn(key, signal())
  );
  return setupEffectCollection(store, createStoreEffect(watchedKeys, effectFn));
}

function handleStoreEffect<T>(store: StoreSignals<T>, effectFn: StoreEffect) {
  const isSignal = (value: any): value is Signal<any> =>
    isFunction(value) && !value.length && "set" in value;

  Object.entries(store)
    .filter(([_, value]) => isSignal(value))
    .forEach(([key, signal]) => {
      const value = (signal as Signal<any>)();
      value !== undefined && effectFn(key, value);
    });
  return setupEffectCollection(store, effectFn);
}

function createValidatedSignal<T, V>(
  key: keyof T,
  value: V,
  internalStore: StoreInternals<T>,
  storeProxy: object
): Signal<V> {
  const sig = signal(value);
  const storeData = stores.get(storeProxy);
  return new Proxy(sig, {
    get: (target, prop) =>
      prop !== "set"
        ? target[prop as keyof Signal<V>]
        : (...args: [V]) => {
            if (internalStore.isDisposed)
              return console.warn(
                `Attempting to update a disposed store signal: ${String(key)}`
              );
            target.set(args[0]);
            storeData?.store?.forEach((cb) => cb(key, args[0]));
          },
  });
}

function createStoreProxy<T>(
  internalStore: StoreInternals<T>
): StoreSignals<T> {
  return new Proxy({} as StoreSignals<T>, {
    get: (_target, prop: string | symbol) => {
      const key = prop as keyof T;
      return key === "effect"
        ? internalStore.methods.get("effect" as keyof T)
        : internalStore.signals.get(key) ??
            internalStore.methods.get(key) ??
            throwUndefinedProperty(prop);
    },
  });
}

function createStoreResult<T>(
  internalStore: StoreInternals<T>
): StoreSignals<T> {
  const methods = Object.fromEntries(internalStore.methods);
  const signals = Object.fromEntries(internalStore.signals);
  return {
    ...methods,
    ...signals,
    set: (update) =>
      processStoreUpdate(internalStore, internalStore.signals, update),
    cleanup: () => cleanupStore(internalStore),
  } as StoreSignals<T>;
}

function createStoreEffect<T>(keys: Set<string>, effectFn: StoreEffect) {
  return (key: keyof any, value: any) =>
    keys.has(key as string) && effectFn(key as keyof StoreState<T>, value);
}

function setupEffectCollection(store: object, effect: StoreEffect) {
  const storeData =
    stores.get(store) ??
    stores
      .set(store, { store: new Set([effect]), effects: new Set() })
      .get(store)!;
  storeData.store.add(effect);
  return () => storeData.store.delete(effect);
}

function cleanupStore<T>(internalStore: StoreInternals<T>): void {
  internalStore.isDisposed = true;
  internalStore.signals.forEach((signal) => signal.dispose?.());
  internalStore.effects.clear();
  internalStore.signals.clear();
  internalStore.methods.clear();
}

const throwUndefinedProperty = (prop: string | symbol) => {
  throw new Error(`Accessing undefined store property: ${String(prop)}`);
};
