import { ComputedConfig, ComputedState, Signal } from "./reactive.types";
import { effect } from "./reactive.effect";
import { signal } from "./reactive.signal";
import { effectDeps, maxDepsExceeded } from "./reactive.security";
import { toError } from "../global";

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

  const cache = signal<T>(undefined as unknown as T, {
    validate: (value) => Boolean(value),
  });

  effect(
    () => {
      const deps = effectDeps(fn);
      if (deps && maxDepsExceeded(deps.size)) {
        throw toError("Computed dependencies limit exceeded");
      }

      const result = fn();
      config?.onCompute?.(result);
      cache.set(result);
    },
    { immediate: true }
  );

  return cache;
}
