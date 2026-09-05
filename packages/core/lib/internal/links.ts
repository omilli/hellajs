import { COMPUTED, SIGNAL_DEPS, TRACKING, WRITABLE, DIRTY } from "./flags";

/**
 * Base interface for all reactive nodes (signals, computeds, effects).
 * @internal
 */
export interface Reactive {
  /** Dependencies of this node. */
  rd?: Link;
  /** The previous dependency link. */
  rpd?: Link;
  /** Subscribers to this node. */
  rs?: Link;
  /** The previous subscriber link. */
  rps?: Link;
  /** Bitmask representing the state of the node (e.g., dirty, tracking). */
  rf: number;
}

/**
 * Represents a link in the doubly-linked list between reactive nodes.
 * @internal
 */
export interface Link {
  /** The source node (the one being subscribed to). */
  ls: Reactive;
  /** The target node (the subscriber). */
  lt: Reactive;
  /** The previous subscriber of the source. */
  lps: Link | undefined;
  /** The next subscriber of the source. */
  lns: Link | undefined;
  /** The previous dependency of the target. */
  lpd: Link | undefined;
  /** The next dependency of the target. */
  lnd: Link | undefined;
}

/**
 * @internal Creates a doubly-linked list node between a source and a target reactive node.
 * @param source The source reactive node (signal or computed).
 * @param target The target reactive node (computed or effect).
 */
export function createLink(source: Reactive, target: Reactive): void {
  const { rpd } = target; // Current dependency being processed
  // Avoid duplicate links to same source (optimization)
  if (rpd && rpd.ls === source) return;

  let nextDep: Link | undefined;
  const isTracking = target.rf & TRACKING; // Check if target is currently tracking dependencies

  // During tracking, try to reuse existing dependencies to avoid allocations
  if (isTracking) {
    // Get next dependency in line to be processed
    nextDep = rpd ? rpd.lnd : target.rd;
    if (nextDep && nextDep.ls === source) {
      target.rpd = nextDep; // Advance rpd to reuse this link as current
      return; // Reuse existing link, no need to create new one
    }
  }

  const prevSub = source.rps; // Previous subscriber in source's subscriber list
  // A computed dependency forces flush-time validation (its value may come out equal) —
  // drop the target's signals-only fast path. One-time: never re-armed, so a stale clear
  // only costs the conservative path
  source.rf & COMPUTED && target.rf & SIGNAL_DEPS && (target.rf &= ~SIGNAL_DEPS);
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
  if (rpd) {
    rpd.lnd = newLink;
  } else {
    target.rd = newLink;
  }
  // Wire up the doubly-linked list pointers in source's subscriber list
  if (prevSub) {
    prevSub.lns = newLink;
  } else {
    source.rs = newLink;
  }
}

/**
 * @internal Removes a link from the reactive graph.
 * @param link The link to remove.
 * @param target The target node to remove the link from.
 * @returns The next dependency link.
 */
export function removeLink(link: Link, target: Reactive): Link | undefined {
  const { ls, lnd, lpd, lns, lps } = link; // Destructure all link pointers

  // Remove link from target's dependency list (doubly-linked list surgery)
  // Update next dependency's previous pointer
  if (lnd) {
    lnd.lpd = lpd;
  } else {
    target.rpd = lpd;
  }
  // Update previous dependency's next pointer
  if (lpd) {
    lpd.lnd = lnd;
  } else {
    target.rd = lnd;
  }

  // Remove link from source's subscriber list (doubly-linked list surgery)
  // Update next subscriber's previous pointer
  if (lns) {
    lns.lps = lps;
  } else {
    ls.rps = lps;
  }
  lps && (lps.lns = lns);                     // Update previous subscriber's next pointer

  // Garbage collection: if source has no subscribers and no previous subscriber
  if (!lps && !(ls.rs = lns)) {
    // Type-bit dispatch: computeds carry COMPUTED — drop the property probe
    if (ls.rf & COMPUTED) {
      // Mark computed as writable and dirty for lazy rebuild on next read
      ls.rf = WRITABLE | COMPUTED | DIRTY;
      // Drain ALL outgoing dependencies; cascades into dep computeds that
      // lose their own last subscriber (mirrors disposeEffect's loop)
      let dep = ls.rd;
      while (dep) dep = removeLink(dep, ls);
    }
  }

  return lnd; // Return next dependency for continued traversal
}
