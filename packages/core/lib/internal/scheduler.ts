import type { Reactive, EffectState } from "../types.d.ts";
import { CLEAN, DIRTY, PENDING } from "./flags";
import { setCurrentSub } from "./context";
import { startTracking, endTracking } from "./tracking";
import { removeLink } from "./links";
import { validateStale } from "./validation";

/** Queue to store effects that need to be executed during flush. */
const effectQueue: (EffectState | Reactive | undefined)[] = [];

/** Flag to indicate an effect is scheduled to run. */
const SCHEDULED = 128;

/** Index of next effect to process and total count of queued effects. */
let queueIndex = 0, effectCount = 0;

/**
 * Schedules an effect to be run synchronously during the next flush.
 * @param effectValue The effect to schedule.
 */
export function scheduleEffect(effectValue: EffectState | Reactive): void {
  const { rf } = effectValue;
  // Avoid duplicate scheduling by checking SCHEDULED flag
  if (!(rf & SCHEDULED)) {
    effectValue.rf = rf | SCHEDULED; // Mark as scheduled
    effectQueue[effectCount++] = effectValue; // Add to queue for batch processing
  }
}

/**
 * Processes the queue of scheduled effects.
 */
export function flush(): void {
  // Process all queued effects in order
  while (queueIndex < effectCount) {
    const effectValue = effectQueue[queueIndex];
    effectQueue[queueIndex++] = undefined; // Clear queue slot for GC
    // Execute effect if it exists, clearing SCHEDULED flag
    effectValue && executeEffect(effectValue, effectValue.rf &= ~SCHEDULED);
  }

  // Reset queue for next batch
  queueIndex = effectCount = 0;
}

/**
 * Disposes of an effect, removing all its dependencies and subscriptions.
 * @param effect The effect to dispose.
 */
export function disposeEffect(effect: EffectState | Reactive): void {
  // Remove all outgoing dependency links (what this effect depends on)
  effect.rd && (effect.rd = removeLink(effect.rd, effect));
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
    const prevSub = setCurrentSub(effectValue); // Set reactive context for dependency tracking
    startTracking(effectValue); // Begin fresh dependency tracking

    try {
      (effectValue as EffectState).ef(); // Execute effect function with automatic tracking
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
