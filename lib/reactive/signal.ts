import { getCurrentEffect, queueEffects } from "./effect";

export interface Signal<T> {
  (): T;
  set: (value: T) => void;
  cleanup: () => void;
  subscribe: (fn: () => void) => () => void
  unsubscribe: (fn: () => void) => void
}

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  let subscribers: Set<() => void> | null = null;

  const signalFn = () => {
    const currentEffect = getCurrentEffect();
    if (currentEffect) {
      if (!subscribers) subscribers = new Set();
      subscribers.add(currentEffect);
      if (currentEffect.subscriptions) {
        currentEffect.subscriptions.add(signalFn as Signal<unknown>);
      }
    }
    return value;
  };

  signalFn.set = (newValue: T) => {
    if (Object.is(value, newValue)) return;
    value = newValue;
    if (subscribers) {
      const subs = Array.from(subscribers);
      queueEffects(subs);
      subscribers.clear();
    }
  };

  signalFn.cleanup = () => {
    subscribers?.clear();
    subscribers = null;
  };

  signalFn.subscribe = (fn: () => void) => {
    if (!subscribers) subscribers = new Set();
    subscribers.add(fn);
    return () => {
      subscribers?.delete(fn);
    };
  };

  signalFn.unsubscribe = (fn: () => void) => {
    subscribers?.delete(fn);
  };

  return signalFn;
}