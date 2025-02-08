import { REACTIVE_STATE } from "./global";
import {
  Signal,
  StoreSignals,
  StoreState,
  StoreInternals,
  StoreEffectFn,
  StoreOptions,
} from "./types";
import { signal, batchSignals } from "./signal";
import { effect } from "./effect";
import { isFunction } from "../global";

const { stores } = REACTIVE_STATE;

export function store<T extends Record<string, any>>(
  factory: (store: StoreSignals<T>) => T,
  options: StoreOptions = {}
) {
  const internalStore: StoreInternals<T> = {
    signals: new Map(),
    methods: new Map(),
    effects: new Set(),
    isDisposed: false,
    isInternal: true,
  };

  const trackedEffect: StoreEffectFn = (fn) => {
    const cleanup = effect(fn);
    internalStore.effects.add(cleanup);
    return cleanup;
  };

  const storeProxy = createStoreProxy(internalStore);
  internalStore.methods.set("effect", trackedEffect);

  const storeEntries = Object.entries(factory(storeProxy));
  internalStore.isInternal = false;
  for (const [key, value] of storeEntries) {
    isFunction(value)
      ? internalStore.methods.set(key, (...args: any[]) =>
          withInternal(internalStore, () => value(...args))
        )
      : internalStore.signals.set(
          key,
          createValidatedSignal(key, value, internalStore, storeProxy, options)
        );
  }

  const storeResult = createStoreResult(internalStore, options);
  stores.set(storeResult, { store: new Set(), effects: internalStore.effects });
  return storeResult;
}

function withInternal<T extends Record<string, any>>(
  internalStore: StoreInternals<T>,
  fn: Function
) {
  internalStore.isInternal = true;
  const result = fn();
  internalStore.isInternal = false;
  return result;
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

function createValidatedSignal<T, V>(
  key: keyof T,
  value: V,
  internalStore: StoreInternals<T>,
  storeProxy: object,
  options: StoreOptions = {}
): Signal<V> {
  const sig = signal(value);
  const storeData = stores.get(storeProxy);
  const isReadonlyKey = Array.isArray(options.readonly)
    ? options.readonly.includes(key as string)
    : options.readonly;

  return new Proxy(sig, {
    get: (target, prop) =>
      prop !== "set"
        ? target[prop as keyof Signal<V>]
        : (...args: [V]) => {
            if (internalStore.isDisposed)
              return console.warn(
                `Attempting to update a disposed store signal: ${String(key)}`
              );
            const isReadonlyExternal =
              isReadonlyKey && !internalStore.isInternal;
            if (isReadonlyExternal) {
              console.warn(
                `Cannot modify readonly store signal: ${String(key)}`
              );
              return;
            }
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
  internalStore: StoreInternals<T>,
  options: StoreOptions = {}
): StoreSignals<T> {
  const methods = Object.fromEntries(internalStore.methods);
  const signals = Object.fromEntries(internalStore.signals);
  return {
    ...methods,
    ...signals,
    set: (update) => {
      const updates = isFunction(update)
        ? update(
            Object.fromEntries(
              internalStore.signals
            ) as unknown as StoreSignals<T>
          )
        : update;
      const hasReadonlyViolation = Object.keys(updates).some((key) =>
        Array.isArray(options.readonly)
          ? options.readonly.includes(key)
          : options.readonly
      );
      return hasReadonlyViolation
        ? console.warn("Cannot modify readonly store properties")
        : processStoreUpdate(internalStore, internalStore.signals, updates);
    },
    cleanup: () => cleanupStore(internalStore),
  } as StoreSignals<T>;
}

function cleanupStore<T>(internalStore: StoreInternals<T>): void {
  internalStore.isDisposed = true;
  internalStore.signals.forEach((signal) => signal.dispose?.());
  internalStore.effects.clear();
  internalStore.signals.clear();
  internalStore.methods.clear();
}

function throwUndefinedProperty(prop: string | symbol) {
  throw new Error(`Accessing undefined store property: ${String(prop)}`);
}
