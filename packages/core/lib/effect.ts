import { currentValue, setCurrentSub } from "./reactive";
import { createLink, removeLink } from "./links";
import { Flags, type EffectValue, type Reactive } from "./types";

/**
 * Creates a reactive effect that runs a function whenever its dependencies change.
 * @param fn The function to execute as a side effect.
 * @returns A cleanup function to stop the effect.
 */
export function effect(fn: () => void): () => void {
  const effectValue: EffectValue = {
    execFn: fn,
    subs: undefined,
    prevSub: undefined,
    deps: undefined,
    prevDep: undefined,
    flags: Flags.G,
  };

  // Link to parent effect if we're nested
  if (currentValue) {
    createLink(effectValue, currentValue);
  }

  // Set this effect as the current reactive context for dependency tracking
  const prevSub = setCurrentSub(effectValue);

  try {
    effectValue.execFn(); // Execute and automatically track dependencies
  } finally {
    setCurrentSub(prevSub); // Restore previous context
  }
  return () => disposeEffect(effectValue);
}

/**
 * Disposes of an effect, removing all its dependencies and subscriptions.
 * @param effect The effect to dispose.
 */
function disposeEffect(effect: EffectValue | Reactive): void {
  // Remove all outgoing dependency links (what this effect depends on)
  let depLink = effect.deps;
  while (depLink) {
    depLink = removeLink(depLink, effect);
  }

  // Remove incoming subscription links (what depends on this effect)
  if (effect.subs) removeLink(effect.subs);

  effect.flags = Flags.C; // Mark as clean/disposed
}
