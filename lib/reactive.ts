import { getCurrentComponent } from "./ui";

export const effectQueue: Set<() => void> = new Set();

let currentEffect: (() => void) | null = null;

let isFlushing = false;

export const getCurrentEffect = () => currentEffect;

export function setCurrentEffect(effect: (() => void) | null): void {
  currentEffect = effect;
}

export const isFlushingEffect = () => isFlushing;

export function setFlushingEffect(flushing: boolean): void {
  isFlushing = flushing;
}

// From effect.ts
export function effect(fn: () => void): () => void {
  let execute: (() => void) | null = () => {
    setCurrentEffect(execute);
    fn();
    setCurrentEffect(null);
  };

  execute();

  const currentComponent = getCurrentComponent();

  if (currentComponent) {
    currentComponent.effects.add(() => {
      execute = null;
    });
  }

  return () => {
    execute = null;
  };
}

export interface Signal<T> {
  (): T;
  set: (value: T) => void;
  cleanup: () => void;
}

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  let subscribers: Set<() => void> | null = null;

  const signalFn = () => {
    const currentEffect = getCurrentEffect();

    if (currentEffect) {
      if (!subscribers) subscribers = new Set();
      subscribers.add(currentEffect);
    }

    const currentComponent = getCurrentComponent();
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
  };

  cleanupEffect = effect(() => {
    recompute();
  });

  const signalFn = () => {
    const currentEffect = getCurrentEffect();
    if (currentEffect) {
      if (!subscribers) subscribers = new Set();
      subscribers.add(currentEffect);
    }

    const currentComponent = getCurrentComponent();
    if (currentComponent) {
      currentComponent.signals.add(signalFn);
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

export function batch<T>(callback: () => T): T {
  const wasFlushing = isFlushingEffect();

  setFlushingEffect(true);

  try {
    const result = callback();

    if (!wasFlushing) {
      queueMicrotask(() => {
        const toRun = Array.from(effectQueue);
        effectQueue.clear();
        setFlushingEffect(false);
        for (const fn of toRun) fn();
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

export function untracked<T>(callback: () => T): T {
  const prevEffect = getCurrentEffect();

  setCurrentEffect(null);

  try {
    return callback();
  } finally {
    setCurrentEffect(prevEffect);
  }
}
