import { REACTIVE_STATE } from "../global";
import { EffectOptions } from "../types";

export function effect(
  fn: () => void,
  options: EffectOptions = {}
): () => void {
  const effectState = {
    active: true,
    fn,
  };

  const cleanup = createCleanupFn(effectState);
  scheduleEffect(effectState, options);

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
  if (index !== -1) {
    REACTIVE_STATE.activeEffectStack.splice(index, 1);
  }
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

function scheduleEffect(
  state: { active: boolean; fn: () => void },
  options: EffectOptions
): void {
  if (options.immediate) {
    executeEffect(state);
  } else {
    queueMicrotask(() => executeEffect(state));
  }
}
