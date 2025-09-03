import type { Reactive, Link, ComputedBase } from './types'
import { F } from './types'

/**
 * Creates a doubly-linked list node between a source and a target reactive node.
 * @param source The source reactive node (signal or computed).
 * @param target The target reactive node (computed or effect).
 */
export const createLink = (source: Reactive, target: Reactive): void => {
  const { rpd } = target;
  // Avoid duplicate links to same source
  if (rpd && rpd.ls === source) return;

  let nextDep: Link | undefined;
  const isTracking = target.rf & F.T;

  // During tracking, reuse existing dependencies
  if (isTracking) {
    nextDep = rpd ? rpd.lnd : target.rd;
    if (nextDep && nextDep.ls === source) {
      target.rpd = nextDep; // Mark as accessed
      return;
    }
  }

  const prevSub = source.rps;

  // Create new bidirectional link
  const newLink = target.rpd = source.rps = {
    ls: source,
    lt: target,
    lpd: rpd,
    lnd: nextDep,
    lps: prevSub,
    lns: undefined,
  };

  // Insert into target's dependency list
  nextDep && (nextDep.lpd = newLink);

  // First dependency
  rpd ? (rpd.lnd = newLink) : (target.rd = newLink);

  // Insert into source's subscriber list
  prevSub ? (prevSub.lns = newLink) : (source.rs = newLink);
}

/**
 * Removes a link from the reactive graph.
 * @param link The link to remove.
 * @param [target=link.target] The target node to remove the link from.
 * @returns The next dependency link.
 */
export const removeLink = (link: Link, target = link.lt): Link | undefined => {
  const { ls, lnd, lpd, lns, lps } = link;

  // Remove link from target's dependency list
  lnd ? (lnd.lpd = lpd) : (target.rpd = lpd);
  // Remove link from source's subscriber list
  lpd ? (lpd.lnd = lnd) : (target.rd = lnd);
  // Remove link from source's subscriber list
  lns ? (lns.lps = lps) : (ls.rps = lps);
  // Remove link from source's subscriber list
  lps && (lps.lns = lns);

  if (!lps && !(ls.rs = lns)) {
    // Garbage collect computed values with no subscribers
    if ((ls as ComputedBase).cbf) {
      let remove = ls.rd;
      if (remove) {
        ls.rf = F.W | F.D; // Mark for cleanup
        // Remove all outgoing dependencies
        while (remove)
          remove = removeLink(remove, ls);
      }
    }
  }

  return lnd;
}
