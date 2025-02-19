import { HELLA_REACTIVE } from "./reactive.global";
import { EffectOptions, EffectState } from "./reactive.types";
import { trackEffect } from "./reactive.security";

const { activeEffects } = HELLA_REACTIVE;

/**
 * Reactive effect that tracks signal dependencies
 */
export function effect(
  fn: () => void,
  { immediate = false }: EffectOptions = {}
): () => void {
  const state: EffectState = { active: true, fn, deps: new Set() };
  const runner = effectRunner(state);

  immediate ? runner() : queueMicrotask(runner);

  return () => {
    if (!state.active) return;
    state.active = false;

    HELLA_REACTIVE.disposedEffects.add(runner);

    state.cleanup?.();
    state.deps.clear();

    const index = activeEffects.indexOf(fn);
    index !== -1 && activeEffects.splice(index, 1);
  };
}

/**
 * Core effect tracking implementation
 */
function effectRunner(state: EffectState) {
  return function run() {
    if (!state.active || HELLA_REACTIVE.disposedEffects.has(run)) return;

    state.deps.clear();

    activeEffects.push(run);

    try {
      const result = state.fn();
      if (typeof result === "function") {
        state.cleanup = result;
        (result as Function)();
      }
    } finally {
      activeEffects.pop();
      trackEffect(run, state.deps);
    }
  };
}
