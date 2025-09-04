import { currentValue, setCurrentSub } from "./reactive";
import { createLink, removeLink } from "./links";
import { F, type EffectValue, type Reactive } from "./types";

/**
 * Creates a reactive effect that runs a function whenever its dependencies change.
 * @param fn The function to execute as a side effect.
 * @returns A cleanup function to stop the effect.
 */
export const effect = (fn: () => void): () => void => {
  const effectValue: EffectValue = {
    ef: fn,
    rs: undefined,
    rps: undefined,
    rd: undefined,
    rpd: undefined,
    rf: F.G,
  };

  // Link to parent effect if we're nested
  currentValue && createLink(effectValue, currentValue);
  // Set this effect as the current reactive context for dependency tracking
  const prevSub = setCurrentSub(effectValue);

  try {
    effectValue.ef(); // Execute and automatically track dependencies
  } finally {
    setCurrentSub(prevSub); // Restore previous context
  }

  return () => disposeEffect(effectValue);
}

/**
 * Disposes of an effect, removing all its dependencies and subscriptions.
 * @param effect The effect to dispose.
 */
const disposeEffect = (effect: EffectValue | Reactive): void => {
  // Remove all outgoing dependency links (what this effect depends on)
  effect.rd && (effect.rd = removeLink(effect.rd, effect));
  // Remove incoming subscription links (what depends on this effect)
  effect.rs && removeLink(effect.rs);
  effect.rf = F.C; // Mark as clean/disposed
}
