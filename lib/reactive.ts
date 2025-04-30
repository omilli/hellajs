/**
 * Signal 
 */
export interface Signal<T> {
  (): T;
  set: (value: T) => void;
  cleanup: () => void;
}

/**
 * A reactive store that combines the original object properties with reactive capabilities
 */
export type Store<T extends object> = T & {
  $update(partial: Partial<T>): void;
  $cleanup(): void;
  $: {
    [K in keyof T]: T[K]; // Properties that can be get/set directly
  };
};

let currentEffect: (() => void) | null = null;

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
 * Creates a reactive store that returns an enhanced object with reactive capabilities
 * @param initial - The initial object value
 * @returns The original object enhanced with $ and $ properties for reactivity
 */
export function store<T extends object>(initial: T): Store<T> {
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
  });

  // Create a result object that includes both the original properties
  // and our special $ property
  const result = {
    ...value,
    $: bindProxy,
    $update(partial: Partial<T>) {
      const changedKeys: (keyof T)[] = [];

      for (const key in partial) {
        if (key in value && !Object.is(value[key], partial[key])) {
          value[key as keyof T] = partial[key] as T[typeof key & keyof T];
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
      // Update the result object to reflect changes
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