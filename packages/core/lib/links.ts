import type { Reactive, Link, ComputedBase } from './types'
import { F } from './types'

/**
 * Creates a doubly-linked list node between a source and a target reactive node.
 * @param source The source reactive node (signal or computed).
 * @param target The target reactive node (computed or effect).
 */
export const createLink = (source: Reactive, target: Reactive): void => {
  const { rpd } = target; // Current dependency being processed
  // Avoid duplicate links to same source (optimization)
  if (rpd && rpd.ls === source) return;

  let nextDep: Link | undefined;
  const isTracking = target.rf & F.T; // Check if target is currently tracking dependencies

  // During tracking, try to reuse existing dependencies to avoid allocations
  if (isTracking) {
    // Get next dependency in line to be processed
    nextDep = rpd ? rpd.lnd : target.rd;
    if (nextDep && nextDep.ls === source) {
      target.rpd = nextDep; // Mark this dependency as accessed/current
      return; // Reuse existing link, no need to create new one
    }
  }

  const prevSub = source.rps; // Previous subscriber in source's subscriber list
  // Create new bidirectional link connecting source and target
  const newLink = target.rpd = source.rps = {
    ls: source,      // Link source (what we depend on)
    lt: target,      // Link target (who depends on source)
    lpd: rpd,        // Previous dependency in target's dependency list
    lnd: nextDep,    // Next dependency in target's dependency list
    lps: prevSub,    // Previous subscriber in source's subscriber list
    lns: undefined,  // Next subscriber (will be set by next link creation)
  };
  // Wire up the doubly-linked list pointers in target's dependency list
  nextDep && (nextDep.lpd = newLink); // Point next dependency back to new link
  // Insert new link into target's dependency list (either after rpd or as first)
  rpd ? (rpd.lnd = newLink) : (target.rd = newLink);
  // Wire up the doubly-linked list pointers in source's subscriber list
  prevSub ? (prevSub.lns = newLink) : (source.rs = newLink);
}

/**
 * Removes a link from the reactive graph.
 * @param link The link to remove.
 * @param [target=link.target] The target node to remove the link from.
 * @returns The next dependency link.
 */
export const removeLink = (link: Link, target = link.lt): Link | undefined => {
  const { ls, lnd, lpd, lns, lps } = link; // Destructure all link pointers

  // Remove link from target's dependency list (doubly-linked list surgery)
  lnd ? (lnd.lpd = lpd) : (target.rpd = lpd); // Update next dependency's previous pointer
  lpd ? (lpd.lnd = lnd) : (target.rd = lnd);  // Update previous dependency's next pointer
  
  // Remove link from source's subscriber list (doubly-linked list surgery)
  lns ? (lns.lps = lps) : (ls.rps = lps);     // Update next subscriber's previous pointer
  lps && (lps.lns = lns);                     // Update previous subscriber's next pointer

  // Garbage collection: if source has no subscribers and no previous subscriber
  if (!lps && !(ls.rs = lns)) {
    // Check if source is a computed value (has compute function)
    if ((ls as ComputedBase).cbf) {
      if (ls.rd) {
        // Mark computed as writable and dirty for cleanup
        ls.rf = F.W | F.D;
        // Recursively remove all outgoing dependencies (clean up dependency tree)
        ls.rd && (ls.rd = removeLink(ls.rd, ls));
      }
    }
  }

  return lnd; // Return next dependency for continued traversal
}
