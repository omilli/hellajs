import { getCurrentEffect, queueEffects } from "./effect";
import { getCurrentScope } from "./scope";
import type { Signal } from "./signal";

export interface Resource<T> {
  (): { value: T | null; loading: boolean; error: unknown | null };
  set: (value: T) => void;
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

  signalFn.set = (newValue: T) => {
    state = { value: newValue, loading: false, error: null };
    if (subscribers) {
      const subs = Array.from(subscribers);
      queueEffects(subs);
      subscribers.clear();
    }
  };

  signalFn.cleanup = () => {
    subscribers?.clear();
    subscribers = null;
    state = { value: null, loading: false, error: null };
  };

  return signalFn;
}