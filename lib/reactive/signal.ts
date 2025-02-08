import { debounceRaf, REACTIVE_STATE } from "../global";
import { Signal, SignalConfig, SignalState } from "./types";

// Core reactive primitive for state management
export function signal<T>(initial: T, config?: SignalConfig<T>): Signal<T> {
  const state = {
    initialized: false,
    initial,
    config,
  };
  return createSignalProxy(state);
}

// Immutable signal that warns on mutation attempts
export function immutable<V>(name: string, value: V): Signal<V> {
  const immutableWarning = () =>
    console.warn(`Cannot modify immutable signal: ${name}`);
  const createDeepProxy = (obj: any): any =>
    new Proxy(obj, {
      set: () => {
        immutableWarning();
        return true;
      },
      get: (target, prop) => {
        const value = target[prop];
        return value && typeof value === "object"
          ? createDeepProxy(value)
          : value;
      },
    });
  const immutableValue = createDeepProxy(value);
  const sig = signal(immutableValue);
  return new Proxy(sig, {
    get: (target, prop) =>
      prop === "set" ? immutableWarning : target[prop as keyof Signal<V>],
    set: () => {
      immutableWarning();
      return true;
    },
  }) as Signal<V>;
}

// Batch multiple signal updates to trigger effects only once
export function batchSignals(fn: () => void): void {
  REACTIVE_STATE.batchingSignals = true;
  fn();
  REACTIVE_STATE.batchingSignals = false;
  REACTIVE_STATE.pendingEffects.forEach((effect) => effect());
  REACTIVE_STATE.pendingEffects.clear();
}

// Type guard to check if a value is a signal
export function isSignal(value: any): value is Signal<any> {
  return (
    value &&
    typeof value === "function" &&
    "set" in value &&
    "subscribe" in value
  );
}

// Subscriber system for managing signal dependencies
function createSubscriber<T>(state: SignalState<T>) {
  const subscribers = new Set<() => void>();
  const debouncedNotify = debounceRaf(() =>
    subscribers.forEach((sub) => sub())
  );
  return {
    add(fn: () => void) {
      subscribers.add(fn);
      state.config?.onSubscribe?.(subscribers.size);
      return () => this.remove(fn);
    },
    remove(fn: () => void) {
      subscribers.delete(fn);
      state.config?.onUnsubscribe?.(subscribers.size);
    },
    notify() {
      if (REACTIVE_STATE.batchingSignals) {
        subscribers.forEach((sub) => REACTIVE_STATE.pendingEffects.add(sub));
        return;
      }
      debouncedNotify();
    },
    clear() {
      subscribers.clear();
    },
  };
}

// Core signal functionality with read/write operations
function createSignalCore<T>(state: SignalState<T>): Signal<T> {
  const subscribers = createSubscriber(state);
  let value =
    state.pendingValue !== undefined ? state.pendingValue : state.initial;
  function read(): T {
    state.config?.onRead?.(value);
    REACTIVE_STATE.activeEffects.length &&
      subscribers.add(REACTIVE_STATE.activeEffects.at(-1)!);
    return value;
  }
  function set(newVal: T): void {
    if (!state.initialized) {
      state.pendingValue = newVal;
      return;
    }
    state.config?.onWrite?.(value, newVal);
    value = newVal;
    subscribers.notify();
  }
  Object.assign(read, {
    set,
    subscribe: (fn: () => void) => subscribers.add(fn),
    dispose: () => {
      state.config?.onDispose?.();
      subscribers.clear();
    },
  });
  return read as Signal<T>;
}

// Proxy handler for lazy signal initialization
function createSignalProxy<T>(state: SignalState<T>): Signal<T> {
  const handler: ProxyHandler<Signal<T>> = {
    get(_, prop: string | symbol) {
      if (prop === "set" && !state.initialized) {
        return (value: T) => {
          state.pendingValue = value;
        };
      }
      if (!state.initialized && prop !== "set") {
        state.signal = createSignalCore(state);
        state.initialized = true;
      }
      return state.signal![prop as keyof Signal<T>];
    },
    apply() {
      if (!state.initialized) {
        state.signal = createSignalCore(state);
        state.initialized = true;
      }
      return state.signal!();
    },
  };
  return new Proxy(() => {}, handler) as Signal<T>;
}
