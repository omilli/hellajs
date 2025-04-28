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
  const subscribers = new Set<() => void>();
  let value = initial;
  const get = () => {
    const current = getCurrentObserver();
    if (current) subscribers.add(current);
    return value;
  };
  const set = (newValue: T) => {
    if (value !== newValue) {
      value = newValue;
      for (const sub of subscribers) sub();
    }
  };
  const cleanup = () => {
    subscribers.clear();
  };
  return { get, set, cleanup };
}

export function createStore<T extends object>(initial: T): ReactiveObject<T> {
  const signals = new Map<keyof T, Signal<T[keyof T]>>();
  for (const key in initial) {
    signals.set(key, createSignal(initial[key]) as unknown as Signal<T[keyof T]>);
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
    try {
      fn();
    } catch (e) {
      console.error('Effect error:', e);
    }
    currentObserver = null;
  };
  execute();
  return () => {
    execute = null;
  };
}