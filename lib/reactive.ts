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

/**
 * A reactive store that combines the original object properties with reactive capabilities.
 * @template T - The type of the object.
 */
export type Store<T extends object> = T & {
  /** Updates specific properties of the object. */
  $update(partial: Partial<T>): void;
  /** Cleans up all subscribers. */
  $cleanup(): void;
  /** Provides reactive bindings for properties. */
  $: {
    [K in keyof T]: T[K];
  };
};

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
 * Creates a reactive store with property-level reactivity.
 * @template T - The type of the object.
 * @param initial - The initial object value.
 * @returns A store with reactive properties and methods.
 */
export function store<T extends object>(initial: T): Store<T> {
  const value = { ...initial };
  const subscribers = new Map<keyof T, Set<() => void>>();

  // Proxy for reactive property bindings.
  const bindProxy = new Proxy({} as Record<string, unknown>, {
    get(_, prop) {
      return () => {
        const key = prop as keyof T;
        // Track subscription for reactivity.
        if (currentEffect) {
          if (!subscribers.has(key)) {
            subscribers.set(key, new Set());
          }
          subscribers.get(key)!.add(currentEffect);
        }
        return value[key];
      };
    },
    set(_, prop, newValue) {
      const key = prop as keyof T;
      const oldValue = value[key];
      if (!Object.is(oldValue, newValue)) {
        value[key] = newValue;
        (result as Record<keyof T, unknown>)[key] = newValue;
        // Queue subscribers for batched execution.
        const subs = subscribers.get(key);
        if (subs) {
          const toRun = Array.from(subs);
          for (let i = 0; i < toRun.length; i++) {
            effectQueue.add(toRun[i]);
          }
          subs.clear();
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
      return true;
    }
  });

  const result = {
    ...value,
    $: bindProxy,
    $update(partial: Partial<T>) {
      const changedKeys: (keyof T)[] = [];
      // Collect changed keys.
      for (const key in partial) {
        if (key in value && !Object.is(value[key], partial[key])) {
          value[key as keyof T] = partial[key] as T[typeof key & keyof T];
          if (subscribers.has(key as keyof T)) changedKeys.push(key as keyof T);
        }
      }
      // Notify subscribers in a batched manner.
      for (let index = 0, len = changedKeys.length; index < len; index++) {
        const key = changedKeys[index];
        const subs = subscribers.get(key);
        if (subs) {
          const toRun = Array.from(subs);
          for (let i = 0; i < toRun.length; i++) {
            effectQueue.add(toRun[i]);
          }
          subs.clear();
        }
      }
      // Schedule flush if not already flushing.
      if (changedKeys.length > 0 && !isFlushing) {
        isFlushing = true;
        queueMicrotask(() => {
          const toRun = Array.from(effectQueue);
          effectQueue.clear();
          isFlushing = false;
          for (const fn of toRun) fn();
        });
      }
      // Update the result object.
      Object.assign(result, partial);
    },
    $cleanup() {
      for (const [_, subs] of subscribers) {
        subs.clear();
      }
      subscribers.clear();
    }
  } as Store<T>;

  return result;
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