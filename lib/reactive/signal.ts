import { effectQueue, getCurrentEffect, isFlushingEffect, setFlushingEffect, queueEffects } from "./effect";
import { getCurrentScope } from "./scope";

export interface Signal<T> {
  (): T;
  set: (value: T | Promise<T>) => void;
  cleanup: () => void;
}

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  let subscribers: Set<() => void> | null = null;
  let isAsyncPending = false;

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

    return value;
  };

  signalFn.set = async (newValue: T | Promise<T>) => {
    if (isAsyncPending) return;
    let resolvedValue: T;
    if (newValue instanceof Promise) {
      isAsyncPending = true;
      try {
        resolvedValue = await newValue;
      } catch (error) {
        console.error('Async signal set failed:', error);
        isAsyncPending = false;
        return;
      } finally {
        isAsyncPending = false;
      }
    } else {
      resolvedValue = newValue;
    }

    if (Object.is(value, resolvedValue)) return;
    value = resolvedValue;
    if (subscribers) {
      const subs = Array.from(subscribers);
      queueEffects(subs);
      subscribers.clear();
    }
  };

  signalFn.cleanup = () => {
    subscribers?.clear();
    subscribers = null;
    isAsyncPending = false;
  };

  return signalFn;
}