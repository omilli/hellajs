import {
  StoreSignals,
  StoreInternals,
  StoreEffectFn,
  StoreOptions,
  StoreComputed,
} from "./store.types";
import { effect } from "../reactive/effect";
import { isFunction } from "../global";
import { computed } from "../reactive/computed";
import { HELLA_STORES } from "./store.global";
import { Signal } from "../reactive";
import { storeProxy, storeSignal } from "./store.proxy";
import { destroyStore, updateStore } from "./store.actions";
import { storeWithFn } from "./store.utils";

const { stores } = HELLA_STORES;

export function store<T extends Record<string, any>>(
  factory: (store: StoreSignals<T>) => T,
  options: StoreOptions = {}
): StoreSignals<T> {
  const internalStore: StoreInternals<T> = {
    signals: new Map(),
    methods: new Map(),
    effects: new Set(),
    isDisposed: false,
    isInternal: true,
  };

  const storeEffect: StoreEffectFn = (fn) => {
    const cleanup = effect(fn);
    internalStore.effects.add(cleanup);
    return cleanup;
  };

  const proxyStore = storeProxy(internalStore);
  internalStore.methods.set("effect", storeEffect);

  const storeEntries = Object.entries(factory(proxyStore));
  internalStore.isInternal = false;
  for (const [key, value] of storeEntries) {
    isFunction(value)
      ? internalStore.methods.set(key, (...args: any[]) =>
          storeWithFn({ internalStore, fn: () => value(...args) })
        )
      : internalStore.signals.set(
          key,
          storeSignal({
            key,
            value,
            internalStore,
            storeProxy,
            options,
          })
        );
  }

  const storeInstance = storeResult(internalStore, options);
  stores.set(storeInstance, {
    store: new Set(),
    effects: internalStore.effects,
  });
  return storeInstance;
}

function storeResult<T>(
  internalStore: StoreInternals<T>,
  options: StoreOptions = {}
): StoreSignals<T> {
  const methods = Object.fromEntries(internalStore.methods);
  const signals = Object.fromEntries(internalStore.signals);

  const getComputedState = () => {
    const state: Partial<StoreComputed<T>> = {};
    for (const [key, signal] of internalStore.signals.entries()) {
      state[key as keyof T] = signal();
    }
    for (const [key, method] of internalStore.methods.entries()) {
      if (key !== "effect") {
        state[key as keyof T] = method();
      }
    }
    return state as StoreComputed<T>;
  };

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
        : updateStore({
            internalStore: internalStore as StoreInternals<Record<string, any>>,
            signals: internalStore.signals as Map<string, Signal<any>>,
            update: updates,
          });
    },
    cleanup: () => destroyStore(internalStore),
    computed: () => computed(getComputedState)(),
  } as StoreSignals<T>;
}
