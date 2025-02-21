import {
  StoreFactory,
  StoreSignals,
  StoreBase,
  StoreEffectFn,
  StoreOptions,
  StoreComputed,
} from "./store.types";
import { effect } from "../reactive/reactive.effect";
import { isFunction } from "../global";
import { computed } from "../reactive/reactive.computed";
import { HELLA_STORES } from "./store.global";
import { Signal } from "../reactive";
import { storeProxy, storeSignal } from "./store.proxy";
import { destroyStore, updateStore } from "./store.actions";
import { storeWithFn } from "./store.utils";

const { stores } = HELLA_STORES;

export function store<T extends Record<string, any>>(
  factory: StoreFactory<T>,
  options: StoreOptions = {}
): StoreSignals<T> {
  const storeBase: StoreBase<T> = {
    signals: new Map(),
    methods: new Map(),
    effects: new Set(),
    isDisposed: false,
    isInternal: true,
  };

  const storeEffect: StoreEffectFn = (fn) => {
    const cleanup = effect(fn);
    storeBase.effects.add(cleanup);
    return cleanup;
  };

  const proxyStore = storeProxy(storeBase);
  storeBase.methods.set("effect", storeEffect);

  const storeEntries = Object.entries(
    isFunction(factory) ? factory(proxyStore) : factory
  );
  storeBase.isInternal = false;
  for (const [key, value] of storeEntries) {
    isFunction(value)
      ? storeBase.methods.set(key, (...args: any[]) =>
          storeWithFn({ storeBase, fn: () => value(...args) })
        )
      : storeBase.signals.set(
          key,
          storeSignal({
            key,
            value,
            storeBase,
            storeProxy,
            options,
          })
        );
  }

  const storeInstance = storeResult(storeBase, options);
  stores.set(storeInstance, {
    store: new Set(),
    effects: storeBase.effects,
  });
  return storeInstance;
}

function storeResult<T>(
  storeBase: StoreBase<T>,
  options: StoreOptions = {}
): StoreSignals<T> {
  const methods = Object.fromEntries(storeBase.methods);
  const signals = Object.fromEntries(storeBase.signals);

  const getComputedState = () => {
    const state: Partial<StoreComputed<T>> = {};
    for (const [key, signal] of storeBase.signals.entries()) {
      state[key as keyof T] = signal();
    }
    for (const [key, method] of storeBase.methods.entries()) {
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
            Object.fromEntries(storeBase.signals) as unknown as StoreSignals<T>
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
            storeBase: storeBase as StoreBase<Record<string, any>>,
            signals: storeBase.signals as Map<string, Signal<any>>,
            update: updates,
          });
    },
    cleanup: () => destroyStore(storeBase),
    computed: () => computed(getComputedState)(),
  } as StoreSignals<T>;
}
