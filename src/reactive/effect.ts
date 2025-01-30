import { REACTIVE_STATE } from "../global";
import { EffectOptions } from "../types";

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

function removeFromEffectStack(fn: () => void): void {
  const index = REACTIVE_STATE.activeEffectStack.indexOf(fn);
  index !== -1 && REACTIVE_STATE.activeEffectStack.splice(index, 1);
}

function executeEffect(state: { active: boolean; fn: () => void }): void {
  if (!state.active) return;
  REACTIVE_STATE.activeEffectStack.push(state.fn);
  try {
    state.fn();
  } finally {
    REACTIVE_STATE.activeEffectStack.pop();
  }
}
