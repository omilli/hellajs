import { getCurrentEffect, queueEffects } from "./effect";
import { getCurrentScope } from "./scope";
import type { Signal } from "./signal";

export interface ResourceState<T> {
  value: T | null;
  loading: boolean;
  error: unknown | null;
}

export interface Resource<T> {
  (): ResourceState<T>;
  set: (value: T) => void;
  refetch: () => Promise<void>;
  cleanup: () => void;
}

export function resource<T>(
  fetcherOrInitial: (() => Promise<T>) | T | null
): Resource<T> {
  let state: ResourceState<T> = {
    value: typeof fetcherOrInitial === "function" ? null : fetcherOrInitial,
    loading: typeof fetcherOrInitial === "function",
    error: null,
  };
  let subscribers: Set<() => void> | null = null;
  let fetcher: (() => Promise<T>) | null =
    typeof fetcherOrInitial === "function" ? (fetcherOrInitial as () => Promise<T>) : null;
  let currentFetch: Promise<void> | null = null;

  const notify = () => {
    if (subscribers) {
      const subs = Array.from(subscribers);
      queueEffects(subs);
      subscribers.clear();
    }
  };

  const refetch = async () => {
    if (!fetcher) return;
    state = { ...state, loading: true, error: null };
    notify();
    try {
      const value = await fetcher();
      state = { value, loading: false, error: null };
      notify();
    } catch (err) {
      state = { ...state, loading: false, error: err };
      notify();
    }
  };

  // If fetcher provided, fetch immediately
  if (fetcher) {
    currentFetch = refetch();
  }

  const signalFn = () => {
    const currentEffect = getCurrentEffect();
    if (currentEffect) {
      if (!subscribers) subscribers = new Set();
      subscribers.add(currentEffect);
    }

    const currentScope = getCurrentScope();
    if (currentScope) {
      currentScope.signals.add(signalFn as Signal<unknown>);
    }

    return state;
  };

  signalFn.set = (newValue: T) => {
    state = { value: newValue, loading: false, error: null };
    notify();
  };

  signalFn.refetch = refetch;

  signalFn.cleanup = () => {
    subscribers?.clear();
    subscribers = null;
    state = { value: null, loading: false, error: null };
    fetcher = null;
    currentFetch = null;
  };

  return signalFn;
}