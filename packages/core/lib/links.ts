import type { Reactive, Link, ComputedBase } from './types'
import { Flags } from './types'

/**
 * Creates a doubly-linked list node between a source and a target reactive node.
 * @param source The source reactive node (signal or computed).
 * @param target The target reactive node (computed or effect).
 */
export function createLink(source: Reactive, target: Reactive): void {
  const { prevDep } = target;
  // Avoid duplicate links to same source
  if (prevDep && prevDep.source === source) return;

  let nextDep: Link | undefined;
  const isTracking = target.flags & Flags.T;

  // During tracking, reuse existing dependencies
  if (isTracking) {
    nextDep = prevDep ? prevDep.nextDep : target.deps;
    if (nextDep && nextDep.source === source) {
      target.prevDep = nextDep; // Mark as accessed
      return;
    }
  }

  const prevSub = source.prevSub;

  // Create new bidirectional link
  const newLink = target.prevDep = source.prevSub = {
    source, target, prevDep, nextDep, prevSub, nextSub: undefined,
  };

  // Insert into target's dependency list
  if (nextDep) {
    nextDep.prevDep = newLink;
  }

  if (prevDep) {
    prevDep.nextDep = newLink;
  } else {
    target.deps = newLink; // First dependency
  }

  // Insert into source's subscriber list
  if (prevSub) {
    prevSub.nextSub = newLink;
  } else {
    source.subs = newLink; // First subscriber
  }
}

/**
 * Removes a link from the reactive graph.
 * @param link The link to remove.
 * @param [target=link.target] The target node to remove the link from.
 * @returns The next dependency link.
 */
export function removeLink(link: Link, target = link.target): Link | undefined {
  const { source, nextDep, prevDep, nextSub, prevSub } = link;

  if (nextDep) {
    nextDep.prevDep = prevDep;
  } else {
    target.prevDep = prevDep;
  }

  if (prevDep) {
    prevDep.nextDep = nextDep;
  } else {
    target.deps = nextDep;
  }

  if (nextSub) {
    nextSub.prevSub = prevSub;
  } else {
    source.prevSub = prevSub;
  }

  if (prevSub) {
    prevSub.nextSub = nextSub;
  }

  else if (!(source.subs = nextSub)) {
    // Garbage collect computed values with no subscribers
    if ((source as ComputedBase).compFn) {
      let remove = source.deps;

      if (remove) {
        source.flags = Flags.W | Flags.D; // Mark for cleanup

        // Remove all outgoing dependencies
        do {
          remove = removeLink(remove, source);
        } while (remove);
      }
    }
  }

  return nextDep;
}
