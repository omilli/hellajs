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

    // Mark effect as disposed
    HELLA_REACTIVE.disposedEffects.add(runner);

    // Run cleanup function if exists
    state.cleanup?.();
    state.deps.clear();

    const index = activeEffects.indexOf(fn);
    index !== -1 && activeEffects.splice(index, 1);
  };
}

/**
 * Core effect tracking implementation
 */
function effectRunner({ active, fn, deps }: EffectState) {
  return function run() {
    if (!active || HELLA_REACTIVE.disposedEffects.has(run)) return;

    // Clear old dependencies
    deps.clear();

    activeEffects.push(run);

    try {
      fn();
    } finally {
      activeEffects.pop();
      trackEffect(run, deps);
    }
  };
}
