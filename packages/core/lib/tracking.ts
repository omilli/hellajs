import type { Reactive } from './types'
import { Flags } from './types'
import { removeLink } from './links'

/**
 * Starts tracking dependencies for a reactive subscriber.
 * @param subscriber The subscriber to start tracking for.
 */
export function startTracking(subscriber: Reactive): void {
  subscriber.prevDep = undefined; // Reset dependency traversal pointer
  // Clear eMit, Dirty, Pending flags and set Tracking flag
  subscriber.flags = (subscriber.flags & ~(Flags.M | Flags.D | Flags.P)) | Flags.T;
}

/**
 * Ends tracking dependencies for a reactive subscriber and removes unused links.
 * @param subscriber The subscriber to end tracking for.
 */
export function endTracking(subscriber: Reactive): void {
  // Remove dependencies that weren't accessed during this execution
  let remove = subscriber.prevDep ? subscriber.prevDep.nextDep : subscriber.deps;
  while (remove) {
    remove = removeLink(remove, subscriber);
  }
  subscriber.flags &= ~4; // Clear Tracking flag (~Flags.T)
}
