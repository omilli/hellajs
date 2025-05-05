import { effectQueue, getCurrentEffect, isFlushingEffect, setFlushingEffect } from "./effect";
import { getCurrentScope } from "./scope";
import type { Signal } from "./signal";

export interface Resource<T> {
  (): { value: T | null; loading: boolean; error: unknown | null };
  set: (value: T | Promise<T>) => void;
  cleanup: () => void;
}

export function resource<T>(initial: T | null): Resource<T> {
  let state = {
    value: initial,
    loading: false,
    error: null as unknown,
  };
  let subscribers: Set<() => void> | null = null;

  const signalFn = () => {
    const currentEffect = getCurrentEffect();
    if (currentEffect) {
      if (!subscribers) subscribers = new Set();
      subscribers.add(currentEffect);
    }

    const currentScope = getCurrentScope();
    if (currentScope) {
      currentScope.signals.add(signalFn as Signal<unknown>);
    }

    return state;
  };

  signalFn.set = async (newValue: T | Promise<T>) => {
    state = { ...state, loading: true, error: null };
    notifySubscribers();

    try {
      const resolvedValue = newValue instanceof Promise ? await newValue : newValue;
      state = { value: resolvedValue, loading: false, error: null };
      notifySubscribers();
    } catch (error) {
      state = { value: state.value, loading: false, error };
      notifySubscribers();
    }
  };

  signalFn.cleanup = () => {
    subscribers?.clear();
    subscribers = null;
    state = { value: null, loading: false, error: null };
  };

  const notifySubscribers = () => {
    if (subscribers) {
      const subs = Array.from(subscribers);
      for (let i = 0; i < subs.length; i++) {
        effectQueue.add(subs[i]);
      }
      subscribers.clear();
      if (!isFlushingEffect()) {
        setFlushingEffect(true);
        queueMicrotask(() => {
          const toRun = Array.from(effectQueue);
          effectQueue.clear();
          setFlushingEffect(false);
          for (const fn of toRun) fn();
        });
      }
    }
  };

  return signalFn;
}