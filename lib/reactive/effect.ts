import { REACTIVE_STATE } from "./global";
import { EffectOptions } from "./types";

// Reactive effect that tracks and responds to signal changes
export function effect(
  fn: () => void,
  options: EffectOptions = {}
): () => void {
  const state = {
    active: true,
    fn,
  };
  const cleanup = createCleanupFn(state);
  options.immediate
    ? executeEffect(state)
    : queueMicrotask(() => executeEffect(state));
  return cleanup;
}

// Cleanup and deactivate effects
function createCleanupFn(state: {
  active: boolean;
  fn: () => void;
}): () => void {
  return function cleanup(): void {
    if (!state.active) return;
    state.active = false;
    removeFromEffectStack(state.fn);
  };
}

// Removes effect function from global effect stack
function removeFromEffectStack(fn: () => void): void {
  const index = REACTIVE_STATE.activeEffects.indexOf(fn);
  index !== -1 && REACTIVE_STATE.activeEffects.splice(index, 1);
}

// Executes effect function and manages effect stack
function executeEffect(state: { active: boolean; fn: () => void }): void {
  if (!state.active) return;
  REACTIVE_STATE.activeEffects.push(state.fn);
  state.fn();
  REACTIVE_STATE.activeEffects.pop();
}
