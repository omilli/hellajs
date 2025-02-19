import {
  debounceRaf,
  isFalse,
  isFunction,
  isUndefined,
  toError,
} from "../global";
import { HELLA_REACTIVE } from "./reactive.global";
import {
  maxSubscribersExceeded,
  maxSubscribersLimit,
  trackSubscriber,
} from "./reactive.security";
import {
  Signal,
  SignalConfig,
  SignalState,
  SignalOptions,
  SignalReadArgs,
  SignalSetArgs,
  SignalSubscribers,
} from "./reactive.types";

let batchingSignals = false;
const { pendingEffects, activeEffects } = HELLA_REACTIVE;

/** Core reactive primitive for state management */
export function signal<T>(initial: T, config?: SignalConfig<T>): Signal<T> {
  // Sanitize initial value first
  if (config?.sanitize) {
    initial = config.sanitize(initial);
  }

  // Then validate if needed
  if (!isUndefined(initial) && isFalse(config?.validate?.(initial))) {
    throw toError(`Signal value validation failed: ${initial}`);
  }

  return signalProxy({ initialized: false, initial, config });
}

/**
 * Batch multiple signal updates to trigger effects once
 */
export function batchSignals(fn: () => void): void {
  batchingSignals = true;
  fn();
  batchingSignals = false;
  pendingEffects.forEach((effect) => effect());
  pendingEffects.clear();
}

/**
 * Type guard for Signal instances
 */
export function isSignal(value: unknown): value is Signal<unknown> {
  return isFunction(value) && "set" in value && "subscribe" in value;
}

/**
 * Signal initialization proxy
 */
function signalProxy<T>(state: SignalState<T>): Signal<T> {
  const handler: ProxyHandler<Signal<T>> = {
    get(_, prop: string | symbol) {
      const isPendingSet = prop === "set" && !state.initialized;
      if (isPendingSet) {
        return (value: T) => {
          state.pendingValue = value;
        };
      }

      if (!state.initialized && prop !== "set") {
        state.signal = signalCore(state);
        state.initialized = true;
      }

      return state.signal![prop as keyof Signal<T>];
    },

    apply() {
      if (!state.initialized) {
        state.signal = signalCore(state);
        state.initialized = true;
      }
      return state.signal!();
    },
  };

  return new Proxy(() => {}, handler) as Signal<T>;
}

/**
 * Core signal implementation
 */
function signalCore<T>(state: SignalState<T>): Signal<T> {
  const subscribers = signalSubscribers(state);
  // Apply sanitization to initial/pending value during core initialization
  const initialValue = state.pendingValue ?? state.initial;
  const value = {
    current: state.config?.sanitize
      ? state.config.sanitize(initialValue)
      : initialValue,
  };

  function read(): T {
    if (state.disposed) return value.current; // Return current value if disposed
    return readSignal({ value: value.current, subscribers, state });
  }

  function set(newVal: T): void {
    setSignal({
      newVal,
      state,
      value,
      subscribers,
      notify: () => subscribers.notify(),
    });
  }

  Object.assign(read, {
    set,
    subscribe: (fn: () => void) => {
      if (state.disposed) return () => {}; // Return no-op if disposed
      return subscribers.add(fn);
    },
    dispose: () => {
      state.disposed = true; // Mark as disposed
      state.config?.onDispose?.();
      subscribers.clear();
    },
  });

  return read as Signal<T>;
}

/**
 * Read current signal value
 */
function readSignal<T>({ value, subscribers, state }: SignalReadArgs<T>): T {
  // Skip validation for undefined values during initialization
  if (
    state.config?.validate &&
    value !== undefined &&
    !state.config.validate(value)
  ) {
    throw toError(`Signal value validation failed: ${value}`);
  }

  state.config?.onRead?.(value);
  activeEffects.length && subscribers.add(activeEffects.at(-1)!);

  return value;
}

/**
 * Set new signal value
 */
function setSignal<T>({
  newVal,
  state,
  value,
  subscribers,
  notify,
}: SignalSetArgs<T>): void {
  // Apply sanitization first, even during initialization
  if (state.config?.sanitize) {
    newVal = state.config.sanitize(newVal);
  }

  if (!state.initialized) {
    state.pendingValue = newVal;
    return;
  }

  // Skip if value hasn't changed
  if (value.current === newVal) return;

  // Then do validation if needed
  if (state.config?.validate && state.config.validate(newVal) === false) {
    throw toError(`Signal value validation failed: ${newVal}`);
  }

  state.config?.onWrite?.(value.current, newVal);
  value.current = newVal;
  notifySubscriber({ subscribers: subscribers.set, notify });
}

/**
 * Signal subscriber management
 */
function signalSubscribers<T>(state: SignalState<T>): SignalSubscribers {
  const subscribers = new Set<() => void>();
  const notify = debounceRaf(() => subscribers.forEach((sub) => sub()));
  const ops: SignalOptions<T> = {
    subscribers,
    notify,
    state,
  };

  return {
    add: addSubscriber(ops),
    remove: (fn) => removeSubscriber({ subscribers, state: state }, fn),
    notify: () => notify(),
    clear: () => subscribers.clear(),
    set: subscribers,
  };
}

/**
 * Add subscriber to signal and return cleanup function
 */
function addSubscriber<T>({ subscribers, state }: SignalOptions<T>) {
  return (fn: () => void) => {
    if (maxSubscribersExceeded(subscribers.size)) {
      throw toError(
        `Maximum subscriber limit (${maxSubscribersLimit()}) exceeded`
      );
    }

    subscribers.add(fn);
    trackSubscriber(state.signal!, subscribers.size);
    state.config?.onSubscribe?.(subscribers.size);

    return () => removeSubscriber({ subscribers, state }, fn);
  };
}

/**
 * Remove subscriber from signal
 */
function removeSubscriber<T>(
  { subscribers, state }: Pick<SignalOptions<T>, "subscribers" | "state">,
  fn: () => void
) {
  if (!state.initialized || state.disposed) return; // Early return if disposed
  subscribers.delete(fn);
  trackSubscriber(state.signal!, subscribers.size);
  state.config?.onUnsubscribe?.(subscribers.size);
}

/**
 * Notify all signal subscribers
 */
function notifySubscriber<T>({
  subscribers,
  notify,
}: Pick<SignalOptions<T>, "subscribers"> & { notify: () => void }) {
  if (batchingSignals) {
    const activeSubscribers = new Set(
      [...subscribers].filter((sub) => !HELLA_REACTIVE.disposedEffects.has(sub))
    );
    activeSubscribers.forEach((sub) => pendingEffects.add(sub));
    return;
  }
  notify();
}
