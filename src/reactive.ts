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

export interface ListItemState<T extends object = Record<string, unknown>> {
  node: Node;
  reactiveObj: ReactiveObject<T>;
  effectCleanup?: () => void;
  vNode: VNode;
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
      if (value !== newValue && subscribers) {
        value = newValue;
        const subs = subscribers ? Array.from(subscribers) : [];
        subscribers?.clear();
        for (let i = 0; i < subs.length; i++) subs[i]();
      }
    },
    cleanup: () => {
      subscribers?.clear();
      subscribers = null;
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