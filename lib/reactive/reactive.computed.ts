import { ComputedConfig, ComputedState, Signal } from "./reactive.types";
import { effect } from "./reactive.effect";
import { signal } from "./reactive.signal";

/**
 * Reactive computed signal with dependency tracking
 */
export function computed<T>(
  fn: () => T,
  config?: ComputedConfig<T>
): Signal<T> {
  const state = { initialized: false, fn, config };
  return computedProxy(state);
}

/**
 * Signal initialization with lazy evaluation
 */
function computedProxy<T>(state: ComputedState<T>): Signal<T> {
  const handler: ProxyHandler<Signal<T>> = {
    get(_, prop: string | symbol) {
      const isInit = !state.initialized;
      if (isInit) {
        state.computed = computedCore(state);
        state.initialized = true;
      }
      return state.computed![prop as keyof Signal<T>];
    },
    apply() {
      const isInit = !state.initialized;
      if (isInit) {
        state.computed = computedCore(state);
        state.initialized = true;
      }
      return state.computed!();
    },
  };

  return new Proxy(() => {}, handler) as Signal<T>;
}

/**
 * Core computed implementation with caching
 */
function computedCore<T>({ fn, config }: ComputedState<T>): Signal<T> {
  config?.onCreate?.();
  let currentValue = fn(); // Store initial computed value
  const cache = signal(currentValue);

  // Use immediate effect to ensure synchronous updates
  effect(
    () => {
      const result = fn();
      if (result !== currentValue) {
        // Only update if value changed
        currentValue = result;
        cache.set(result);
        config?.onCompute?.(result);
      }
    },
    { immediate: true }
  );

  return cache;
}
