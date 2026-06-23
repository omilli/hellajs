import { currentValue, setCurrentSub, addScopeEffect } from "./internal/context";
import { disposeEffect } from "./internal/scheduler";
import { createLink } from "./internal/links";
import { GUARDED } from "./internal/flags";
import { isFunction } from "./internal/utils";
import type { EffectState } from "./types";

/**
 * Creates a reactive effect that runs a function whenever its dependencies change.
 * @param effectFn The function to execute as a side effect. May return a cleanup function that runs before re-execution and on disposal.
 * @returns A cleanup function to stop the effect.
 */
export function effect(effectFn: () => (() => void) | void): () => void {
  if (!isFunction(effectFn)) {
    throw new Error(`[core] effect: effectFn must be a function, received ${typeof effectFn}`);
  }
  const effectState: EffectState = {
    ef: effectFn,
    rs: undefined,
    rps: undefined,
    rd: undefined,
    rpd: undefined,
    rf: GUARDED,
  };

  // Link to parent effect if nested: this makes parent re-run when child is disposed
  // Must happen before setCurrentSub so the link targets the parent, not this effect
  currentValue && createLink(effectState, currentValue);
  // Set this effect as the current reactive context for dependency tracking
  const prevSub = setCurrentSub(effectState);

  try {
    const result = effectState.ef(); // Execute and track dependencies
    effectState.ec = isFunction(result) ? result : undefined; // Capture cleanup return value
  } finally {
    setCurrentSub(prevSub); // Restore previous context
  }

  const cleanup = () => disposeEffect(effectState);

  // Register with active scope if one exists
  addScopeEffect(cleanup);

  return cleanup;
}