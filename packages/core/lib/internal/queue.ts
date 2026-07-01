import type { Reactive } from "./links";
import { SCHEDULED } from "./flags";

/** Queue to store effects that need to be executed during flush. */
const effectQueue: (Reactive | undefined)[] = [];

/** Index of next effect to process and total count of queued effects. */
let queueIndex = 0, effectCount = 0;

/**
 * @internal Schedules an effect to be run synchronously during the next flush.
 * @param effectValue The effect to schedule.
 */
export function scheduleEffect(effectValue: Reactive): void {
  const { rf } = effectValue;
  if (!(rf & SCHEDULED)) {
    effectValue.rf = rf | SCHEDULED;
    effectQueue[effectCount++] = effectValue;
  }
}

/**
 * @internal Gets the next effect from the queue and clears the SCHEDULED flag.
 * @returns The next effect or undefined if queue is empty.
 */
export function getNextEffect(): Reactive | undefined {
  if (queueIndex < effectCount) {
    const effectValue = effectQueue[queueIndex]!;
    effectQueue[queueIndex++] = undefined; // Clear queue slot for GC
    effectValue.rf &= ~SCHEDULED; // Clear SCHEDULED flag
    return effectValue;
  }
}

/**
 * @internal Checks if there are more effects in the queue.
 */
export function hasQueuedEffects(): boolean {
  return queueIndex < effectCount;
}

/**
 * @internal Resets the effect queue.
 */
export function resetQueue(): void {
  queueIndex = effectCount = 0;
}
