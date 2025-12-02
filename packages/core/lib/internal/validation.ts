import type { Stack, Reactive, Link, SignalState, ComputedState } from "../types";
import { DIRTY, WRITABLE, PENDING } from "./flags";
import { updateValue } from "./execution";
import { propagate } from "./propagation";

/**
 * Validates the dependency graph of a subscriber to see if it is stale.
 * @param link The starting dependency link.
 * @param subscriber The subscriber to validate.
 * @returns True if the subscriber is stale.
 */
export function validateStale(link: Link, subscriber: Reactive): boolean {
  let stack: Stack<Link> | undefined, depth = 0; // Stack for nested validation traversal

  validate: do {
    const { ls, lps, lnd } = link; // Source, prev subscriber, next dependency
    const { rf, rs } = ls; // Source flags and subscribers

    // Check if subscriber is already known to be stale
    let isStale = !!(subscriber.rf & DIRTY);

    if (!isStale) {
      // If source is writable and dirty, update it and check for changes
      if ((rf & (WRITABLE | DIRTY)) === (WRITABLE | DIRTY)) {
        if (updateValue(ls as SignalState | ComputedState)) {
          rs?.lns && propagate(rs); // Propagate changes to other subscribers
          isStale = true; // Mark as stale if value changed
        }
      }
      // If source is writable and pending, dive deeper to validate its dependencies
      else if ((rf & (WRITABLE | PENDING)) === (WRITABLE | PENDING)) {
        // Push current context to stack if source has subscribers or previous links
        stack = rs || lps ? { sv: link, sp: stack } : stack;
        link = ls.rd!; // Move to source's first dependency
        subscriber = ls; // Source becomes new subscriber to validate
        ++depth; // Increase nesting depth
        continue; // Continue validation deeper
      }
    }

    // If not stale and has more dependencies to check, move to next dependency
    if (!isStale && lnd) {
      link = lnd;
      continue;
    }

    // Unwind the stack when done with current level
    while (depth) {
      --depth; // Decrease nesting depth
      const firstSub = subscriber.rs!; // First subscriber of current node
      const hasManySubs = !!firstSub.lns; // Check if multiple subscribers

      // Get next link to process from stack or first subscriber
      link = hasManySubs ? stack!.sv : firstSub;
      const { lt, lnd } = link; // Target and next dependency of link

      hasManySubs && (stack = stack!.sp); // Pop stack if multiple subscribers

      // If stale, update the subscriber and continue if value changed
      if (isStale && updateValue(subscriber as SignalState | ComputedState)) {
        hasManySubs && propagate(firstSub); // Notify other subscribers
        subscriber = lt; // Move to link target
        continue; // Continue validation
      } else {
        subscriber.rf &= ~PENDING; // Clear pending flag if not stale
      }

      subscriber = lt; // Move to link target

      isStale = false; // Reset stale flag for next level
    }

    return isStale; // Return final staleness result

  } while (true);
}
