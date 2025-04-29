import { type VNode } from "./dom";

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

export interface RecordSignal<T extends object> {
  <K extends keyof T>(key: K): T[K];
  set: (value: T) => void;
  update: (partial: Partial<T>) => void;
  cleanup: () => void;
}

export interface ListItemState {
  node: Node;
  reactiveObj: ReactiveObject<{}>;
  vNode: VNode;
  effectCleanup?: () => void;
}

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

export function record<T extends object>(initial: T): RecordSignal<T> {
  const value = { ...initial };
  const subscribers = new Map<keyof T, Set<() => void>>();

  // Create the callable function
  const reactiveFn = <K extends keyof T>(key: K) => {
    if (currentEffect) {
      if (!subscribers.has(key)) subscribers.set(key, new Set());
      subscribers.get(key)!.add(currentEffect);
    }
    return value[key];
  };

  // Attach methods
  reactiveFn.set = (newValue: T) => {
    const changedKeys: (keyof T)[] = [];
    for (const key in newValue) {
      if (!Object.is(value[key], newValue[key])) {
        value[key] = newValue[key];
        if (subscribers.has(key)) changedKeys.push(key);
      }
    }
    changedKeys.forEach(key => {
      const subs = subscribers.get(key);
      if (subs) {
        const toRun = Array.from(subs);
        subs.clear();
        for (let i = 0; i < toRun.length; i++) toRun[i]();
      }
    });
  };

  reactiveFn.update = (partial: Partial<T>) => {
    const changedKeys: (keyof T)[] = [];
    for (const key in partial) {
      if (key in value && !Object.is(value[key], partial[key])) {
        value[key as keyof T] = partial[key] as T[typeof key & keyof T];
        if (subscribers.has(key as keyof T)) changedKeys.push(key as keyof T);
      }
    }
    changedKeys.forEach(key => {
      const subs = subscribers.get(key);
      if (subs) {
        const toRun = Array.from(subs);
        subs.clear();
        for (let i = 0; i < toRun.length; i++) toRun[i]();
      }
    });
  };

  reactiveFn.cleanup = () => {
    subscribers.forEach(subs => subs.clear());
    subscribers.clear();
  };

  return reactiveFn;
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
    signals.forEach(signal => signal.cleanup());
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