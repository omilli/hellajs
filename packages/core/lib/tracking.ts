import type { Reactive } from './types'
import { F } from './types'
import { removeLink } from './links'

/**
 * Starts tracking dependencies for a reactive subscriber.
 * @param subscriber The subscriber to start tracking for.
 */
export const startTracking = (subscriber: Reactive): void => {
  subscriber.rpd = undefined; // Reset dependency traversal pointer for fresh tracking
  // Clear eMit, Dirty, Pending flags and set Tracking flag for new execution
  subscriber.rf = (subscriber.rf & ~(F.M | F.D | F.P)) | F.T;
}

/**
 * Ends tracking dependencies for a reactive subscriber and removes unused links.
 * @param subscriber The subscriber to end tracking for.
 */
export const endTracking = (subscriber: Reactive): void => {
  // Remove stale dependencies that weren't accessed during this execution
  // Everything after rpd (last accessed) or from rd (if nothing accessed) is stale
  let remove = subscriber.rpd ? subscriber.rpd.lnd : subscriber.rd;
  remove && (remove = removeLink(remove, subscriber)); // Remove unused dependency chain
  subscriber.rf &= ~4; // Clear Tracking flag (~F.T) to end tracking phase
}
