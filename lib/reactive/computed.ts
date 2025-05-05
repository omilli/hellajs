import { effect, getCurrentEffect, queueEffects } from "./effect";
import { getCurrentScope } from "./scope";
import type { Signal } from "./signal";

export function computed<T>(getter: () => T): Signal<T> {
  let value: T | undefined;
  let subscribers: Set<() => void> | null = null;
  let cleanupEffect: (() => void) | null = null;
  let isDirty = false;

  // Recompute and notify subscribers if value changed
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

  // Eagerly recompute when dependencies change
  function setupEffect() {
    cleanupEffect = effect(() => {
      isDirty = true;
      recompute();
    });
  }

  // Initialize effect and value (effect will set value)
  setupEffect();

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

    if (isDirty || cleanupEffect === null) {
      if (cleanupEffect === null) {
        setupEffect();
      }
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
    value = undefined;
    isDirty = true;
  };

  return signalFn;
}