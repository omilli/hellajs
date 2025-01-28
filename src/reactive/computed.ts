import { ComputedConfig, ComputedState, Signal } from "../types";
import { effect } from "./effect";
import { signal } from "./signal";

export function computed<T>(
  fn: () => T,
  config?: ComputedConfig<T>
): Signal<T> {
  const state = createComputedState(fn, config);
  return createComputedProxy(state);
}

function createComputedState<T>(
  fn: () => T,
  config?: ComputedConfig<T>
): ComputedState<T> {
  return {
    initialized: false,
    fn,
    config,
  };
}

function initializeComputed<T>(state: ComputedState<T>): Signal<T> {
  if (!state.initialized) {
    state.computed = setupComputedSignal(state);
    state.initialized = true;
  }
  return state.computed!;
}

function setupComputedSignal<T>(state: ComputedState<T>): Signal<T> {
  state.config?.onCreate?.();
  const cached = signal<T>(undefined as unknown as T);

  effect(
    () => {
      const newValue = state.fn();
      state.config?.onCompute?.(newValue);
      cached.set(newValue);
    },
    { immediate: true }
  );

  return cached;
}

function createComputedProxy<T>(state: ComputedState<T>): Signal<T> {
  const handler: ProxyHandler<Signal<T>> = {
    get(_: any, prop: string | symbol) {
      const computed = initializeComputed(state);
      return computed[prop as keyof Signal<T>];
    },
    apply() {
      const computed = initializeComputed(state);
      return computed();
    },
  };

  return new Proxy(() => {}, handler) as Signal<T>;
}
