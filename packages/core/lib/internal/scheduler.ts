import type { Reactive, EffectState } from "../types";
import { CLEAN, DIRTY, PENDING } from "./flags";
import { setCurrentSub } from "./context";
import { startTracking, endTracking } from "./tracking";
import { removeLink } from "./links";
import { validateStale } from "./validation";
import { getNextEffect, hasQueuedEffects, resetQueue, SCHEDULED } from "./queue";
import { isFunction } from "./utils";

/**
 * Processes the queue of scheduled effects.
 */
export function flush(): void {
  // Process all queued effects in order
  while (hasQueuedEffects()) {
    const effectValue = getNextEffect();
    // Execute effect if it exists (SCHEDULED flag already cleared by getNextEffect)
    effectValue && executeEffect(effectValue, effectValue.rf);
  }

  // Reset queue for next batch
  resetQueue();
}

/**
 * Disposes of an effect, removing all its dependencies and subscriptions.
 * @param effect The effect to dispose.
 */
export function disposeEffect(effect: EffectState | Reactive): void {
  // Run cleanup return value if it exists
  (effect as EffectState).ec?.();
  // Remove all outgoing dependency links (what this effect depends on)
  let dep = effect.rd;
  while (dep) dep = removeLink(dep, effect);
  effect.rd = undefined;
  // Remove incoming subscription links (what depends on this effect)
  effect.rs && removeLink(effect.rs);
  effect.rf = CLEAN; // Mark as clean/disposed
}

/**
 * Executes an effect if it is stale.
 * @param effectValue The effect to execute.
 * @param flags The current flags of the effect.
 */
function executeEffect(effectValue: EffectState | Reactive, flags: number): void {
  // Execute if dirty or pending with stale dependencies
  if (
    flags & DIRTY // Definitely dirty
    || (flags & PENDING && validateStale(effectValue.rd!, effectValue)) // Maybe dirty - validate
  ) {
    // Call cleanup return value from previous execution
    (effectValue as EffectState).ec?.();
    const prevSub = setCurrentSub(effectValue); // Set reactive context for dependency tracking
    startTracking(effectValue); // Begin fresh dependency tracking

    try {
      // Capture cleanup return value from effect function
      const result = (effectValue as EffectState).ef();
      (effectValue as EffectState).ec = isFunction(result) ? result : undefined;
    } finally {
      setCurrentSub(prevSub); // Restore previous reactive context
      endTracking(effectValue); // Clean up unused dependencies from previous execution
    }

    return; // Early return - effect was executed
  }

  // If pending but not stale, just clear the pending flag
  flags & PENDING && (effectValue.rf = flags & ~PENDING);

  // Process any scheduled dependent effects in dependency order
  let { rd } = effectValue;

  while (rd) {
    const { ls, lnd } = rd;
    const { rf } = ls;
    // Execute scheduled dependencies recursively
    rf & SCHEDULED && executeEffect(ls, ls.rf = rf & ~SCHEDULED);
    rd = lnd; // Move to next dependency
  }
}
