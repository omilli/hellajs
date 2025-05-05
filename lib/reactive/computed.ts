import { effect, getCurrentEffect, queueEffects } from "./effect";
import { getCurrentScope } from "./scope";
import type { Signal } from "./signal";

export function computed<T>(getter: () => T | Promise<T>): Signal<T> {
  let value: T | undefined;
  let isDirty = true;
  let subscribers: Set<() => void> | null = null;
  let cleanupEffect: (() => void) | null = null;
  let isAsyncPending = false;

  const recompute = async () => {
    if (isAsyncPending) return;
    isAsyncPending = true;
    try {
      const newValue = await getter();
      if (!Object.is(value, newValue)) {
        value = newValue;
        if (subscribers) {
          const subs = Array.from(subscribers);
          queueEffects(subs);
          subscribers.clear();
        }
      }
      isDirty = false;
    } catch (error) {
      console.error('Async computed failed:', error);
    } finally {
      isAsyncPending = false;
    }
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

    if (isDirty && !isAsyncPending) {
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
    isAsyncPending = false;
    value = undefined;
  };

  return signalFn;
}