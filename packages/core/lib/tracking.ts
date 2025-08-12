import type { Reactive } from './types'
import { Flags } from './types'
import { removeLink } from './links'

/**
 * Starts tracking dependencies for a reactive subscriber.
 * @param subscriber The subscriber to start tracking for.
 */
export function startTracking(subscriber: Reactive): void {
  subscriber.prevDep = undefined;
  subscriber.flags = (subscriber.flags & ~(Flags.M | Flags.D | Flags.P)) | Flags.T;
}

/**
 * Ends tracking dependencies for a reactive subscriber and removes unused links.
 * @param subscriber The subscriber to end tracking for.
 */
export function endTracking(subscriber: Reactive): void {
  let remove = subscriber.prevDep ? subscriber.prevDep.nextDep : subscriber.deps;
  while (remove) {
    remove = removeLink(remove, subscriber);
  }
  subscriber.flags &= ~4; // ~Tracking
}
