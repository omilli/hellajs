import { currentValue, setCurrentSub, addScopeEffect } from "./internal/context";
import { disposeEffect } from "./internal/scheduler";
import { createLink } from "./internal/links";
import { GUARDED, EFFECT_DEP, SIGNAL_DEPS } from "./internal/flags";
import { isFunction } from "./internal/utils";
import type { Reactive } from "./internal/links";

/**
 * Interface for an effect.
 * @internal
 */
export interface EffectState extends Reactive {
  /** The function to execute as a side effect. */
  ef(): void;
  /** Cleanup function returned by the effect, called before re-execution and on disposal. */
  ec?: () => void;
}

/**
 * Creates a reactive effect that runs a function whenever its dependencies change.
 * @param effectFn The function to execute as a side effect. May return a cleanup function that runs before re-execution and on disposal. A returned function is captured as cleanup; any other return value is ignored.
 * @returns A cleanup function to stop the effect.
 * @throws {Error} When effectFn is not a function.
 */
export function effect(effectFn: () => unknown): () => void {
  if (!isFunction(effectFn)) {
    throw new Error(`[core] effect: effectFn must be a function, received ${typeof effectFn}`);
  }
  const effectState: EffectState = {
    ef: effectFn,
    rs: undefined,
    rps: undefined,
    rd: undefined,
    rpd: undefined,
    // SIGNAL_DEPS: assumes signals-only deps; a computed link clears it permanently
    rf: GUARDED | SIGNAL_DEPS,
  };

  // Link to parent effect if nested: the link lands in parent.rd / child.rs so the
  // scheduler's post-run SCHEDULED walk executes scheduled child effects in dependency order.
  // Must happen before setCurrentSub so the link targets the parent, not this effect
  if (currentValue) {
    createLink(effectState, currentValue);
    // Mark effect parents once: their skip path must walk scheduled child effects.
    // The bit is never cleared — a stale bit only costs a no-op walk.
    currentValue.rf & GUARDED && (currentValue.rf |= EFFECT_DEP);
  }
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