import type { Reactive } from "./links";
import { DIRTY, PENDING, TRACKING } from "./flags";
import { removeLink } from "./links";

/**
 * @internal Starts tracking dependencies for a reactive subscriber.
 * @param subscriber The subscriber to start tracking for.
 */
export function startTracking(subscriber: Reactive): void {
  subscriber.rpd = undefined; // Reset dependency traversal pointer for fresh tracking
  // Clear COMPUTING, DIRTY, PENDING flags and set TRACKING flag for new execution
  subscriber.rf = (subscriber.rf & ~(DIRTY | PENDING)) | TRACKING;
}

/**
 * @internal Ends tracking dependencies for a reactive subscriber and removes unused links.
 * @param subscriber The subscriber to end tracking for.
 */
export function endTracking(subscriber: Reactive): void {
  // Remove stale dependencies that weren't accessed during this execution
  // Everything after rpd (last accessed) or from rd (if nothing accessed) is stale
  const remove = subscriber.rpd ? subscriber.rpd.lnd : subscriber.rd;
  remove && removeLink(remove, subscriber);
  subscriber.rf &= ~TRACKING; // Clear TRACKING flag to end tracking phase
}
