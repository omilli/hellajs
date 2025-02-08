import { debounceRaf } from "../global";
import { REACTIVE_STATE } from "./global";
import { Signal, SignalConfig, SignalState } from "./types";

let { batchingSignals } = REACTIVE_STATE;
const { pendingEffects, activeEffects, security } = REACTIVE_STATE;

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
export const immutable = <T>(
  key: string | number | symbol,
  value: T
): Signal<T> => {
  const sig = signal(value);
  return new Proxy(sig, {
    get(target, prop) {
      if (prop === "set") {
        return () =>
          console.warn(`Cannot modify readonly property: ${String(key)}`);
      }
      return target[prop as keyof typeof target];
    },
  }) as Signal<T>;
};

// Batch multiple signal updates to trigger effects only once
export function batchSignals(fn: () => void): void {
  batchingSignals = true;
  fn();
  batchingSignals = false;
  pendingEffects.forEach((effect) => effect());
  pendingEffects.clear();
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
      const currentCount = subscribers.size;
      if (currentCount >= security.maxSubscribers) {
        throw new Error(
          `Maximum subscriber limit (${security.maxSubscribers}) exceeded`
        );
      }
      subscribers.add(fn);
      security.signalSubscriberCount.set(state.signal!, subscribers.size);
      state.config?.onSubscribe?.(subscribers.size);
      return () => this.remove(fn);
    },
    remove(fn: () => void) {
      subscribers.delete(fn);
      state.config?.onUnsubscribe?.(subscribers.size);
    },
    notify() {
      if (batchingSignals) {
        subscribers.forEach((sub) => pendingEffects.add(sub));
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
    if (state.config?.validate && !state.config.validate(value)) {
      throw new Error("Signal value validation failed");
    }
    state.config?.onRead?.(value);
    activeEffects.length && subscribers.add(activeEffects.at(-1)!);
    return value;
  }
  function set(newVal: T): void {
    if (!state.initialized) {
      state.pendingValue = newVal;
      return;
    }
    if (state.config?.validate && !state.config.validate(newVal)) {
      throw new Error("Signal value validation failed");
    }
    const sanitizedValue = state.config?.sanitize
      ? state.config.sanitize(newVal)
      : newVal;
    state.config?.onWrite?.(value, sanitizedValue);
    value = sanitizedValue;
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
