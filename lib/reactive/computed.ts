import { effect, getCurrentEffect, queueEffects } from "./effect";
import { getCurrentScope } from "./scope";
import type { Signal } from "./signal";

export function computed<T>(getter: () => T): Signal<T> {
  let value: T | undefined;
  let isDirty = true;
  let subscribers: Set<() => void> | null = null;
  let cleanupEffect: (() => void) | null = null;

  const recompute = () => {
    const newValue = getter();
    if (!Object.is(value, newValue)) {
      value = newValue;
      if (subscribers) {
        const subs = Array.from(subscribers);
        queueEffects(subs);
        subscribers.clear();
      }
    }
    isDirty = false;
  };

  cleanupEffect = effect(() => {
    isDirty = true; // Mark dirty on dependency change, recompute on next read
  });

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

    if (isDirty) {
      recompute();
    }

    return value as T;
  };

  signalFn.set = () => { };

  signalFn.cleanup = () => {
    if (cleanupEffect) {
      cleanupEffect();
      cleanupEffect = null;
    }
    subscribers?.clear();
    subscribers = null;
    isDirty = true;
    value = undefined;
  };

  return signalFn;
}