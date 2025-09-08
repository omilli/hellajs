import { currentValue, disposeEffect, setCurrentSub } from "./reactive";
import { createLink } from "./links";
import { type EffectState } from "./types";
import { FLAGS } from "./flags";

/**
 * Creates a reactive effect that runs a function whenever its dependencies change.
 * @param fn The function to execute as a side effect.
 * @returns A cleanup function to stop the effect.
 */
export function effect(fn: () => void): () => void {
  const effectState: EffectState = {
    ef: fn,
    rs: undefined,
    rps: undefined,
    rd: undefined,
    rpd: undefined,
    rf: FLAGS.G,
  };

  // Link to parent effect if we're nested
  currentValue && createLink(effectState, currentValue);
  // Set this effect as the current reactive context for dependency tracking
  const prevSub = setCurrentSub(effectState);

  try {
    effectState.ef(); // Execute and automatically track dependencies
  } finally {
    setCurrentSub(prevSub); // Restore previous context
  }

  return () => disposeEffect(effectState);
}