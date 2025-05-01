import type { Signal } from './types';
import { currentComponent } from './component';

let currentEffect: (() => void) | null = null;
const effectQueue: Set<() => void> = new Set();
let isFlushing = false;

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  let subscribers: Set<() => void> | null = null;

  const signalFn = () => {
    if (currentEffect) {
      if (!subscribers) subscribers = new Set();
      subscribers.add(currentEffect);
    }
    if (currentComponent) {
      currentComponent.signals.add(signalFn as Signal<unknown>);
    }
    return value;
  };

  signalFn.set = (newValue: T) => {
    if (Object.is(value, newValue)) return;
    value = newValue;
    if (subscribers) {
      const subs = Array.from(subscribers);
      for (let i = 0; i < subs.length; i++) {
        effectQueue.add(subs[i]);
      }
      subscribers.clear();
      if (!isFlushing) {
        isFlushing = true;
        queueMicrotask(() => {
          const toRun = Array.from(effectQueue);
          effectQueue.clear();
          isFlushing = false;
          for (const fn of toRun) fn();
        });
      }
    }
  };

  signalFn.cleanup = () => {
    subscribers?.clear();
    subscribers = null;
  };

  return signalFn;
}

export function computed<T>(getter: () => T): Signal<T> {
  let value: T;
  let isDirty = true;
  let subscribers: Set<() => void> | null = null;
  let cleanupEffect: (() => void) | null = null;

  const recompute = () => {
    const newValue = getter();
    if (!Object.is(value, newValue)) {
      value = newValue;
      if (subscribers) {
        const subs = Array.from(subscribers);
        for (let i = 0; i < subs.length; i++) {
          effectQueue.add(subs[i]);
        }
        subscribers.clear();
        if (!isFlushing) {
          isFlushing = true;
          queueMicrotask(() => {
            const toRun = Array.from(effectQueue);
            effectQueue.clear();
            isFlushing = false;
            for (const fn of toRun) fn();
          });
        }
      }
    }
    isDirty = false;
  };

  cleanupEffect = effect(() => {
    recompute();
  });

  const signalFn = () => {
    if (currentEffect) {
      if (!subscribers) subscribers = new Set();
      subscribers.add(currentEffect);
    }
    if (currentComponent) {
      currentComponent.signals.add(signalFn); // Register computed signal with component
    }
    if (isDirty) {
      recompute();
    }
    return value;
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
  };

  return signalFn;
}

export function effect(fn: () => void): () => void {
  let execute: (() => void) | null = () => {
    currentEffect = execute;
    fn();
    currentEffect = null;
  };
  execute();
  if (currentComponent) {
    currentComponent.effects.add(() => {
      execute = null;
    });
  }
  return () => {
    execute = null;
  };
}


export function batch<T>(callback: () => T): T {
  const wasFlushing = isFlushing;

  isFlushing = true;

  try {
    const result = callback();

    if (!wasFlushing) {
      queueMicrotask(() => {
        const toRun = Array.from(effectQueue);
        effectQueue.clear();
        isFlushing = false;
        for (const fn of toRun) fn();
      });
    }

    return result;
  } catch (error) {
    if (!wasFlushing) {
      isFlushing = false;
    }
    throw error;
  }
}


export function untracked<T>(callback: () => T): T {
  const prevEffect = currentEffect;

  currentEffect = null;

  try {
    return callback();
  } finally {
    currentEffect = prevEffect;
  }
}