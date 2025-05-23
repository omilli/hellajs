import type { Signal } from "../types";
import { getCurrentEffect, queueEffects } from "./effect";

export function signal<T>(initialValue: T): Signal<T> {
  let cachedValue = initialValue;
  let subscribers: Set<() => void> | null = null;

  const signalFn = (value: T = cachedValue) => {
    if (!Object.is(cachedValue, value)) {
      signalFn.set(value);
      return value;
    }
    const currentEffect = getCurrentEffect();
    if (currentEffect) {
      subscribers ??= new Set();
      subscribers.add(currentEffect);
      currentEffect.subscriptions?.add(signalFn as Signal<unknown>);
    }
    return cachedValue;
  };

  signalFn.set = (newValue: T) => {
    if (Object.is(cachedValue, newValue)) return;
    cachedValue = newValue;
    if (!subscribers) return;
    queueEffects(subscribers);
    subscribers.clear();
  };

  signalFn.cleanup = () => {
    subscribers = null;
  };

  signalFn.subscribe = (fn: () => void) => {
    subscribers ??= new Set();
    subscribers.add(fn);
    return () => subscribers?.delete(fn);
  };

  signalFn.unsubscribe = (fn: () => void) => {
    subscribers?.delete(fn);
  };

  return signalFn;
}