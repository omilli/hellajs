import type { Stack, Reactive, Link } from "../types";
import { PENDING, DIRTY, GUARDED, WRITABLE, TRACKING, COMPUTING, CLEAN } from "./flags";
import { scheduleEffect } from "./scheduler";

/**
 * Propagates the dirty flag to all subscribers of a reactive node.
 * @param link The starting link of subscribers to propagate to.
 */
export function propagate(link: Link): void {
  // Walk through all subscribers in the linked list
  while (link) {
    const { lt, lns } = link; // Target node and next subscriber
    const { rf } = lt;

    // If only pending (not dirty), mark as dirty
    if ((rf & (PENDING | DIRTY)) === PENDING) {
      lt.rf = rf | DIRTY; // Upgrade from pending to dirty
      rf & GUARDED && scheduleEffect(lt); // Schedule effects for execution
    }
    link = lns!; // Move to next subscriber
  }
}

/**
 * Propagates a change notification through the reactive graph.
 * @param link The starting link of subscribers.
 */
export function propagateChange(link: Link): void {
  let { lns } = link; // Next sibling link to process
  let stack: Stack<Link | undefined> | undefined; // Stack for depth-first traversal

  process: do {
    const { lt } = link; // Target node of current link
    let { rf, rs } = lt; // Flags and subscribers of target

    // Only process writable signals and guarded effects
    if (rf & (WRITABLE | GUARDED)) {
      const m1 = TRACKING | COMPUTING, m2 = m1 | DIRTY | PENDING;

      // State machine: mark as pending if clean, or clean if already computing
      (!(rf & m2)) ? (lt.rf = rf | PENDING) : rf = CLEAN;

      // Schedule guarded effects (effects with GUARDED flag) for execution
      rf & GUARDED && scheduleEffect(lt);

      // For writable signals, traverse their subscribers depth-first
      if (rf & WRITABLE && rs) {
        link = rs; // Move to first subscriber

        // If multiple subscribers, use stack to remember siblings
        if (rs.lns) {
          stack = { sv: lns, sp: stack }; // Push current sibling list to stack
          lns = rs.lns; // Set next sibling for later processing
        }
        continue; // Continue with depth-first traversal
      }
    }

    // Process next sibling subscriber at current level
    if ((link = lns!)) {
      lns = link.lns; // Move to its next sibling
      continue;
    }

    // No more siblings - backtrack using stack
    if (stack) {
      link = stack.sv!; // Pop link from stack
      stack = stack.sp; // Pop stack frame

      if (link) {
        lns = link.lns; // Get next sibling to process
        continue process; // Continue with popped link
      }
    }
    break; // No more links to process
  } while (true);
}
