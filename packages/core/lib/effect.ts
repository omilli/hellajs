import { currentValue, setCurrentSub, addScopeEffect } from "./internal/context";
import { disposeEffect } from "./internal/scheduler";
import { link } from "./internal/system";
import { WATCHING, RECURSED_CHECK, SIGNAL_DEPS } from "./internal/flags";
import { isFunction } from "./internal/utils";
import type { ReactiveNode } from "./internal/system";
import type { EffectOptions } from "./types";

/**
 * Effect node: a sink that re-runs its function when its dependencies change.
 * Carries the function and the cleanup captured from its last run.
 * @internal
 */
export interface EffectNode extends ReactiveNode {
  /** The function to execute as a side effect. */
  fn(): void;
  /** Cleanup function returned by the effect, called before re-execution and on disposal. */
  cleanup?: () => void;
}

/**
 * Creates a reactive effect that runs a function whenever its dependencies change.
 * @param effectFn The function to execute as a side effect. May return a cleanup function that runs before re-execution and on disposal. A returned function is captured as cleanup; any other return value is ignored.
 * @param options Behavior switches. `separate` skips linking to the running parent effect — the effect tracks, runs, and disposes independently (registration in an external registry owns its lifetime).
 * @returns A cleanup function to stop the effect.
 * @throws {Error} When effectFn is not a function.
 */
export function effect(effectFn: () => unknown, options?: EffectOptions): () => void {
  if (!isFunction(effectFn)) {
    throw new Error(`[core] effect: effectFn must be a function, received ${typeof effectFn}`);
  }
  const effectNode: EffectNode = {
    fn: effectFn,
    cleanup: undefined,
    deps: undefined,
    depsTail: undefined,
    subs: undefined,
    subsTail: undefined,
    // SIGNAL_DEPS: assumes signals-only deps; a computed link clears it.
    // RECURSED_CHECK: executing now — re-entrant propagation must not queue this run
    flags: WATCHING | RECURSED_CHECK | SIGNAL_DEPS,
  };

  // Link to the parent effect if nested: the parent subscribes to this child, so the
  // scheduler's notify can queue ancestors ahead of children and a parent disposal
  // detaches the child. Must happen before setCurrentSub so the link targets the parent.
  // `separate` skips the link: the effect tracks, runs, and disposes independently —
  // post-028 the link drives nothing observable (notify walks no ancestors), so an
  // external registry owning the lifetime needs no edge
  const parent = currentValue;
  !options?.separate && parent !== undefined && link(effectNode, parent, 0);
  // Set this effect as the current reactive context for dependency tracking
  const previousSub = setCurrentSub(effectNode);

  try {
    const result = effectNode.fn(); // Execute and track dependencies
    effectNode.cleanup = isFunction(result) ? result : undefined; // Capture cleanup return value
  } catch (error) {
    // The first run threw: the effect never started, so it must leave no subscribed
    // state (no cleanup return exists and no disposer reaches the caller). Runs before
    // the finally restores the previous context; disposeEffect reads no global context.
    disposeEffect(effectNode);
    throw error;
  } finally {
    setCurrentSub(previousSub); // Restore previous context
    effectNode.flags &= ~RECURSED_CHECK; // The initial run is over — normal notification applies
  }

  const cleanup = () => disposeEffect(effectNode);

  // Register with active scope if one exists
  addScopeEffect(cleanup);

  return cleanup;
}
