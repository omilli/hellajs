import { type VNode } from "./dom";

export interface ReactiveObject<T extends object = Record<string, unknown>> {
  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): void;
  cleanup(): void;
}

export interface Signal<T> {
  get: () => T;
  set: (value: T) => void;
  cleanup: () => void;
}

export interface FineGrainedSignal<T extends object> {
  get: <K extends keyof T>(key: K) => T[K];
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

export function createSignal<T>(initial: T): Signal<T> {
  let value = initial;
  let subscribers: Set<() => void> | null = null;
  return {
    get: () => {
      const current = getCurrentObserver();
      if (current) {
        if (!subscribers) subscribers = new Set();
        subscribers.add(current);
      }
      return value;
    },
    set: (newValue: T) => {
      if (Object.is(value, newValue)) return;
      value = newValue;
      if (subscribers) {
        const subs = Array.from(subscribers);
        subscribers.clear();
        for (let i = 0; i < subs.length; i++) subs[i]();
      }
    },
    cleanup: () => {
      subscribers?.clear();
      subscribers = null;
    },
  };
}

export function createFineGrainedSignal<T extends object>(initial: T): FineGrainedSignal<T> {
  const value = { ...initial };
  const subscribers = new Map<keyof T, Set<() => void>>();

  return {
    get: <K extends keyof T>(key: K) => {
      const current = getCurrentObserver();
      if (current) {
        if (!subscribers.has(key)) subscribers.set(key, new Set());
        subscribers.get(key)!.add(current);
      }
      return value[key];
    },
    set: (newValue: T) => {
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
    },
    update: (partial: Partial<T>) => {
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
    },
    cleanup: () => {
      subscribers.forEach(subs => subs.clear());
      subscribers.clear();
    },
  };
}

export function createStore<T extends object>(initial: T): ReactiveObject<T> {
  const signals = new Map<keyof T, Signal<T[keyof T]>>();
  const keys = Object.keys(initial) as (keyof T)[];
  for (let i = 0; i < keys.length; i++) {
    signals.set(keys[i], createSignal(initial[keys[i]]) as Signal<T[keyof T]>);
  }
  return {
    get: <K extends keyof T>(key: K) => signals.get(key)!.get() as T[K],
    set: <K extends keyof T>(key: K, value: T[K]) => signals.get(key)!.set(value),
    cleanup: () => {
      signals.forEach(signal => signal.cleanup());
      signals.clear();
    },
  };
}

let currentObserver: (() => void) | null = null;
export function getCurrentObserver(): (() => void) | null {
  return currentObserver;
}

export function createEffect(fn: () => void): () => void {
  let execute: (() => void) | null = () => {
    currentObserver = execute;
    fn();
    currentObserver = null;
  };
  execute();
  return () => {
    execute = null;
  };
}