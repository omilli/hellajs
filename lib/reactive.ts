/**
 * A reactive signal that tracks a single value.
 * @template T - The type of the value.
 */
export interface Signal<T> {
  /** Gets the current value and subscribes to updates. */
  (): T;
  /** Sets a new value, triggering updates. */
  set: (value: T) => void;
  /** Cleans up subscribers. */
  cleanup: () => void;
}


// Tracks the current effect for dependency collection.
let currentEffect: (() => void) | null = null;
// Queue for batching effect updates.
const effectQueue: Set<() => void> = new Set();
let isFlushing = false;

/**
 * Creates a reactive signal for a single value.
 * @template T - The type of the value.
 * @param initial - The initial value.
 * @returns A signal with get, set, and cleanup methods.
 */
export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  let subscribers: Set<() => void> | null = null;

  const signalFn = () => {
    // Subscribe the current effect if present.
    if (currentEffect) {
      if (!subscribers) subscribers = new Set();
      subscribers.add(currentEffect);
    }
    return value;
  };

  signalFn.set = (newValue: T) => {
    if (Object.is(value, newValue)) return;
    value = newValue;
    // Queue subscribers for batched execution.
    if (subscribers) {
      const subs = Array.from(subscribers);
      for (let i = 0; i < subs.length; i++) {
        effectQueue.add(subs[i]);
      }
      subscribers.clear();
      // Schedule flush if not already flushing.
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

/**
 * Creates a computed signal that derives its value from other signals or store properties.
 * The value is memoized and recomputed only when dependencies change.
 * @template T - The type of the computed value.
 * @param getter - Function that computes the value based on reactive dependencies.
 * @returns A signal that provides the computed value, with cleanup support.
 */
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
    recompute(); // Always run getter to re-subscribe dependencies.
  });

  const signalFn = () => {
    if (currentEffect) {
      if (!subscribers) subscribers = new Set();
      subscribers.add(currentEffect);
    }
    if (isDirty) {
      recompute();
    }
    return value;
  };

  signalFn.set = () => {
    // No-op: computed signals are read-only.
  };

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

/**
 * Runs a function reactively, re-executing when dependencies change, with batched updates.
 * @param fn - The function to run.
 * @returns A cleanup function to stop the effect.
 */
export function effect(fn: () => void): () => void {
  let execute: (() => void) | null = () => {
    currentEffect = execute;
    fn();
    currentEffect = null;
  };
  execute();
  return () => {
    execute = null;
  };
}