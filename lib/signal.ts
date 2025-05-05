import { effect, effectQueue, getCurrentEffect, isFlushingEffect, setCurrentEffect, setFlushingEffect } from "./effect";
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

  signalFn.cleanup = () => {
    subscribers?.clear();
    subscribers = null;
    isAsyncPending = false;
  };

  return signalFn;
}

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
      }
      isDirty = false;
    } catch (error) {
      console.error('Async computed failed:', error);
    } finally {
      isAsyncPending = false;
    }
  };

  cleanupEffect = effect(async () => {
    await recompute();
  });

  const signalFn = () => {
    const currentEffect = getCurrentEffect();
    if (currentEffect) {
      if (!subscribers) subscribers = new Set();
      subscribers.add(currentEffect);
    }

    const currentScope = getCurrentScope();
    if (currentScope) {
      currentScope.signals.add(signalFn);
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
  };

  return signalFn;
}


export async function batch<T>(callback: () => T | Promise<T>): Promise<T> {
  const wasFlushing = isFlushingEffect();
  setFlushingEffect(true);

  try {
    const result = await Promise.resolve(callback());
    if (!wasFlushing) {
      await new Promise<void>((resolve) => {
        queueMicrotask(() => {
          const toRun = Array.from(effectQueue);
          effectQueue.clear();
          setFlushingEffect(false);
          for (const fn of toRun) fn();
          resolve();
        });
      });
    }
    return result;
  } catch (error) {
    if (!wasFlushing) {
      setFlushingEffect(false);
    }
    throw error;
  }
}

export function untracked<T>(callback: () => T | Promise<T>): Promise<T> {
  const prevEffect = getCurrentEffect();

  setCurrentEffect(null);

  try {
    const result = callback();
    if (result instanceof Promise) {
      return result;
    }
    return Promise.resolve(result);
  } finally {
    setCurrentEffect(prevEffect);
  }
}