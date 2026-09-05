import type { Reactive } from "./links";
import { TRACKING } from "./flags";
import { removeLink } from "./links";

/**
 * @internal Ends tracking dependencies for a reactive subscriber and removes unused links.
 * @param subscriber The subscriber to end tracking for.
 */
export function endTracking(subscriber: Reactive): void {
  // Remove stale dependencies that weren't accessed during this execution
  // Everything after rpd (last accessed) or from rd (if nothing accessed) is stale
  let remove = subscriber.rpd ? subscriber.rpd.lnd : subscriber.rd;
  while (remove) remove = removeLink(remove, subscriber);
  subscriber.rf &= ~TRACKING; // Clear TRACKING flag to end tracking phase
}
