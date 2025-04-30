import { type VNode } from "./dom";

/**
 * A reactive record that combines the original object properties with reactive capabilities
 */
export type RecordSignal<T extends object> = T & {
  $set(value: T): void;
  $update(partial: Partial<T>): void;
  $cleanup(): void;
  $bind: {
    [K in keyof T]: T[K]; // Properties that can be get/set directly
  };
};

export interface ReactiveObject<T extends object = Record<string, unknown>> {
  <K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): void;
  cleanup(): void;
}

export interface Signal<T> {
  (): T;
  set: (value: T) => void;
  cleanup: () => void;
}

export interface ListItemState {
  node: Node; // Required for DOM operations
  effectCleanup?: () => void; // Cleanup for effects
}

let currentEffect: (() => void) | null = null;

/**
 * Processes changes in a reactive object and notifies subscribers
 * 
 * @param value - The current state object
 * @param changes - The changes to apply to the state object
 * @param subscribers - Map of subscribers to notify when properties change
 * @returns An array of keys that were changed
 */
function processChanges<T extends object>(
  value: T,
  changes: Partial<T>,
  subscribers: Map<keyof T, Set<() => void>>
): void {
  const changedKeys: (keyof T)[] = [];

  for (const key in changes) {
    if (key in value && !Object.is(value[key], changes[key])) {
      value[key as keyof T] = changes[key] as T[typeof key & keyof T];
      if (subscribers.has(key as keyof T)) changedKeys.push(key as keyof T);
    }
  }

  for (let index = 0, len = changedKeys.length; index < len; index++) {
    const key = changedKeys[index];
    const subs = subscribers.get(key);
    if (subs) {
      const toRun = Array.from(subs);
      subs.clear();
      for (let i = 0; i < toRun.length; i++) toRun[i]();
    }
  }
}

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  let subscribers: Set<() => void> | null = null;

  // Create the function that will be returned
  const signalFn = () => {
    if (currentEffect) {
      if (!subscribers) subscribers = new Set();
      subscribers.add(currentEffect);
    }
    return value;
  };

  // Attach methods to the function
  signalFn.set = (newValue: T) => {
    if (Object.is(value, newValue)) return;
    value = newValue;
    if (subscribers) {
      const subs = Array.from(subscribers);
      subscribers.clear();
      for (let i = 0; i < subs.length; i++) subs[i]();
    }
  };

  signalFn.cleanup = () => {
    subscribers?.clear();
    subscribers = null;
  };

  return signalFn;
}

/**
 * Creates a reactive record that returns an enhanced object with reactive capabilities
 * @param initial - The initial object value
 * @returns The original object enhanced with $ and $bind properties for reactivity
 */
export function record<T extends object>(initial: T): RecordSignal<T> {
  const value = { ...initial };
  const subscribers = new Map<keyof T, Set<() => void>>();

  // Create bindings for reactive properties with getter/setter syntax
  const bindProxy = new Proxy({} as Record<string, unknown>, {
    // Handle property reads - track dependencies
    get(_, prop) {
      return () => {
        const key = prop as keyof T;

        // Track subscription for reactivity
        if (currentEffect) {
          if (!subscribers.has(key)) {
            subscribers.set(key, new Set());
          }
          subscribers.get(key)!.add(currentEffect);
        }

        return value[key];
      }
    },

    // Handle property writes - update and notify
    set(_, prop, newValue) {
      const key = prop as keyof T;
      const oldValue = value[key];

      if (!Object.is(oldValue, newValue)) {
        // Update the internal value
        value[key] = newValue;

        // Also update the result object
        (result as Record<keyof T, unknown>)[key] = newValue;

        // Notify subscribers
        const subs = subscribers.get(key);
        if (subs) {
          const toRun = Array.from(subs);
          subs.clear();
          for (let i = 0; i < toRun.length; i++) toRun[i]();
        }
      }

      return true; // Property was set successfully
    }
  }) as RecordSignal<T>['$bind'];

  // Create a result object that includes both the original properties
  // and our special $ and $bind properties
  const result = {
    ...value,
    $bind: bindProxy,
    $set(newValue: T) {
      processChanges(value, newValue, subscribers);
      // Update the result object to reflect changes
      Object.assign(result, newValue);
    },
    $update(partial: Partial<T>) {
      processChanges(value, partial, subscribers);
      // Update the result object to reflect changes
      Object.assign(result, partial);
    },
    $cleanup() {
      for (const [_, subs] of subscribers) {
        subs.clear();
      }
      subscribers.clear();
    }
  } as RecordSignal<T>;

  return result;
}

export function store<T extends object>(initial: T): ReactiveObject<T> {
  const signals = new Map<keyof T, Signal<T[keyof T]>>();
  const keys = Object.keys(initial) as (keyof T)[];

  for (let i = 0; i < keys.length; i++) {
    signals.set(keys[i], signal(initial[keys[i]]) as Signal<T[keyof T]>);
  }

  // Create the callable function
  const storeFn = <K extends keyof T>(key: K) => signals.get(key)!() as T[K];

  // Attach methods
  storeFn.set = <K extends keyof T>(key: K, value: T[K]) => signals.get(key)!.set(value);

  storeFn.cleanup = () => {
    for (const [_, signal] of signals) {
      signal.cleanup();
    }
    signals.clear();
  };

  return storeFn;
}

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