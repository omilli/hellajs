import { REACTIVE_STATE } from "./global";
import { EffectOptions, Signal } from "./types";

const { activeEffects, security } = REACTIVE_STATE;

// Reactive effect that tracks and responds to signal changes
export function effect(
  fn: () => void,
  options: EffectOptions = {}
): () => void {
  const state = {
    active: true,
    fn,
    dependencies: new Set<Signal<any>>(),
  };

  const wrappedFn = () => {
    activeEffects.push(wrappedFn);
    state.dependencies.clear();

    try {
      fn();
    } finally {
      activeEffects.pop();
      security.effectDependencies.set(wrappedFn, state.dependencies);

      if (state.dependencies.size > security.maxDependencies) {
        throw new Error(
          `Effect exceeded maximum dependency limit of ${security.maxDependencies}`
        );
      }
    }
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
  const index = activeEffects.indexOf(fn);
  index !== -1 && activeEffects.splice(index, 1);
}

// Executes effect function and manages effect stack
function executeEffect(state: { active: boolean; fn: () => void }): void {
  if (!state.active) return;
  activeEffects.push(state.fn);
  state.fn();
  activeEffects.pop();
}
