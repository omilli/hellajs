import { HELLA_REACTIVE } from "./reactive.global";
import { EffectOptions, EffectState } from "./reactive.types";
import { maxDepsExceeded, trackEffect } from "./reactive.security";

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
    const index = activeEffects.indexOf(fn);
    index !== -1 && activeEffects.splice(index, 1);
  };
}

/**
 * Core effect tracking implementation
 */
function effectRunner({ active, fn, deps }: EffectState) {
  return function run() {
    if (!active) return;

    activeEffects.push(run);
    deps.clear();

    try {
      fn();
    } finally {
      activeEffects.pop();
      trackEffect(run, deps);

      if (maxDepsExceeded(deps.size)) {
        throw new Error("Effect dependencies limit exceeded");
      }
    }
  };
}
