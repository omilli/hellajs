/**
 * The vendored reactive machinery, extracted from alien-signals 3.2.1
 * (`esm/system.mjs`, MIT, © Johnson CodeHK — see LICENSE). Logic is preserved
 * verbatim; this port adds types, JSDoc, and the repo's named flag constants.
 * Every behavioral decision (queueing, disposal, node kinds) lives with the host
 * callbacks in `lib/internal/scheduler.ts`.
 */
import { NONE, MUTABLE, WATCHING, RECURSED_CHECK, RECURSED, DIRTY, PENDING } from "./flags";

/**
 * Base shape of every reactive node (signals, computeds, effects): two
 * doubly-linked adjacency lists (outgoing dependencies, incoming subscribers)
 * plus a flag word.
 * @internal
 */
export interface ReactiveNode {
  /** Last-linked dependency (tracking bookmark); `undefined` while unlinked. */
  deps?: Link;
  /** Tail of the dependency list — links after it are stale and get purged. */
  depsTail?: Link;
  /** First subscriber link; `undefined` while unsubscribed. */
  subs?: Link;
  /** Tail of the subscriber list — new links append here. */
  subsTail?: Link;
  /** Bitmask state word (see `lib/internal/flags.ts`). */
  flags: number;
}

/**
 * A doubly-linked edge between a dependency and its subscriber, stamped with the
 * tracking version that created it. One link is shared by both adjacency lists:
 * `prevDep`/`nextDep` thread the subscriber's dependency list, `prevSub`/`nextSub`
 * thread the dependency's subscriber list.
 * @internal
 */
export interface Link {
  /** Tracking version at link creation — recursion dedup compares stamps. */
  version: number;
  /** The node being subscribed to. */
  dep: ReactiveNode;
  /** The subscribing node. */
  sub: ReactiveNode;
  /** Previous link in the subscriber's dependency list. */
  prevDep: Link | undefined;
  /** Next link in the subscriber's dependency list. */
  nextDep: Link | undefined;
  /** Previous link in the dependency's subscriber list. */
  prevSub: Link | undefined;
  /** Next link in the dependency's subscriber list. */
  nextSub: Link | undefined;
}

/** Node in the shared traversal stack behind `propagate`/`checkDirty`'s iterative DFS. */
interface Stack<T> {
  value: T;
  prev: Stack<T> | undefined;
}

/**
 * Host callbacks the bound system invokes. `lib/internal/scheduler.ts` provides
 * them — bound at its module init via `setSystemHost`, so this module imports no
 * scheduler values (cycle break); the factory leaves node kinds, queueing, and
 * disposal to the host.
 */
export interface ReactiveHost {
  /** Re-evaluates a mutable node (computed or signal); returns whether its committed value changed. */
  update(node: ReactiveNode): boolean;
  /** Queues an armed effect for the next flush. */
  notify(node: ReactiveNode): void;
  /** Releases a node that just lost its last subscriber. */
  unwatched(node: ReactiveNode): void;
}

/**
 * @internal Builds the graph-machinery functions over host callbacks: link
 * management, depth-first change propagation, staleness checks, and shallow
 * dirty-marking. The returned closures share one module instance.
 * @param host The `update`/`notify`/`unwatched` callbacks owned by the scheduler.
 * @returns The five graph functions (`link`, `unlink`, `propagate`, `checkDirty`, `shallowPropagate`).
 */
export function createReactiveSystem(host: ReactiveHost) {
  return {
    link,
    unlink,
    propagate,
    checkDirty,
    shallowPropagate,
  };

  /**
   * Links `dep` as a dependency of `sub`, reusing an existing live link when
   * possible. `version` stamps the link so propagation can distinguish links
   * created by the current tracking pass.
   */
  function link(dep: ReactiveNode, sub: ReactiveNode, version: number): void {
    const prevDep = sub.depsTail;
    if (prevDep !== undefined && prevDep.dep === dep) {
      return;
    }
    const nextDep = prevDep !== undefined ? prevDep.nextDep : sub.deps;
    if (nextDep !== undefined && nextDep.dep === dep) {
      nextDep.version = version;
      sub.depsTail = nextDep;
      return;
    }
    const prevSub = dep.subsTail;
    if (prevSub !== undefined && prevSub.version === version && prevSub.sub === sub) {
      return;
    }
    const newLink =
      (sub.depsTail =
      dep.subsTail =
        {
          version,
          dep,
          sub,
          prevDep,
          nextDep,
          prevSub,
          nextSub: undefined,
        });
    if (nextDep !== undefined) {
      nextDep.prevDep = newLink;
    }
    if (prevDep !== undefined) {
      prevDep.nextDep = newLink;
    } else {
      sub.deps = newLink;
    }
    if (prevSub !== undefined) {
      prevSub.nextSub = newLink;
    } else {
      dep.subs = newLink;
    }
  }

  /**
   * Removes `link` from both adjacency lists. Returns the next dependency link so
   * callers can keep walking a subscriber's list. Detaching a dependency's last
   * subscriber hands the node to the host's `unwatched`.
   */
  function unlink(link: Link, sub: ReactiveNode = link.sub): Link | undefined {
    const { dep, prevDep, nextDep, nextSub, prevSub } = link;
    if (nextDep !== undefined) {
      nextDep.prevDep = prevDep;
    } else {
      sub.depsTail = prevDep;
    }
    if (prevDep !== undefined) {
      prevDep.nextDep = nextDep;
    } else {
      sub.deps = nextDep;
    }
    if (nextSub !== undefined) {
      nextSub.prevSub = prevSub;
    } else {
      dep.subsTail = prevSub;
    }
    if (prevSub !== undefined) {
      prevSub.nextSub = nextSub;
    } else if ((dep.subs = nextSub) === undefined) {
      host.unwatched(dep);
    }
    return nextDep;
  }

  /**
   * Depth-first walk over `link`'s subscriber list marking nodes PENDING (and
   * RECURSED under `innerWrite`, i.e. writes nested inside an effect run).
   * Armed (WATCHING) nodes are handed to the host's `notify`; MUTABLE nodes are
   * descended into, siblings stacked for backtracking.
   */
  function propagate(link: Link, innerWrite: boolean): void {
    let next = link.nextSub;
    let stack: Stack<Link | undefined> | undefined;
    top: do {
      const sub = link.sub;
      let flags = sub.flags;
      if (!(flags & (RECURSED_CHECK | RECURSED | DIRTY | PENDING))) {
        sub.flags = flags | PENDING;
        if (innerWrite) {
          sub.flags |= RECURSED;
        }
      } else if (!(flags & (RECURSED_CHECK | RECURSED))) {
        flags = NONE;
      } else if (!(flags & RECURSED_CHECK)) {
        sub.flags = (flags & ~RECURSED) | PENDING;
      } else if (!(flags & (DIRTY | PENDING)) && isValidLink(link, sub)) {
        sub.flags = flags | (RECURSED | PENDING);
        flags &= MUTABLE;
      } else {
        flags = NONE;
      }
      if (flags & WATCHING) {
        host.notify(sub);
      }
      if (flags & MUTABLE) {
        const subSubs = sub.subs;
        if (subSubs !== undefined) {
          const nextSub = subSubs.nextSub;
          if (nextSub !== undefined) {
            stack = { value: next, prev: stack };
            next = nextSub;
          }
          link = subSubs;
          continue;
        }
      }
      if ((link = next!) !== undefined) {
        next = link.nextSub;
        continue;
      }
      while (stack !== undefined) {
        link = stack.value!;
        stack = stack.prev;
        if (link !== undefined) {
          next = link.nextSub;
          continue top;
        }
      }
      break;
    } while (true);
  }

  /**
   * Decides whether `sub` (currently PENDING) is actually stale, diving through
   * pending computeds depth-first. Confirmed changes re-commit intermediate
   * values (via the host's `update`) and shallow-mark their subscribers; equal
   * results clear PENDING so the flush skips the node entirely.
   */
  function checkDirty(link: Link, sub: ReactiveNode): boolean {
    let stack: Stack<Link> | undefined;
    let checkDepth = 0;
    let dirty = false;
    top: do {
      const dep = link.dep;
      const flags = dep.flags;
      if (sub.flags & DIRTY) {
        dirty = true;
      } else if ((flags & (MUTABLE | DIRTY)) === (MUTABLE | DIRTY)) {
        const subs = dep.subs;
        if (host.update(dep)) {
          if (subs!.nextSub !== undefined) {
            shallowPropagate(subs!);
          }
          dirty = true;
        }
      } else if ((flags & (MUTABLE | PENDING)) === (MUTABLE | PENDING)) {
        stack = { value: link, prev: stack };
        link = dep.deps!;
        sub = dep;
        ++checkDepth;
        continue;
      }
      if (!dirty) {
        const nextDep = link.nextDep;
        if (nextDep !== undefined) {
          link = nextDep;
          continue;
        }
      }
      while (checkDepth--) {
        link = stack!.value;
        stack = stack!.prev;
        if (dirty) {
          const subs = sub.subs;
          if (host.update(sub)) {
            if (subs!.nextSub !== undefined) {
              shallowPropagate(subs!);
            }
            sub = link.sub;
            continue;
          }
          dirty = false;
        } else {
          sub.flags &= ~PENDING;
        }
        sub = link.sub;
        const nextDep = link.nextDep;
        if (nextDep !== undefined) {
          link = nextDep;
          continue top;
        }
      }
      return dirty && !!sub.flags;
    } while (true);
  }

  /**
   * Marks the subscribers on `link`'s list DIRTY after a confirmed value change,
   * queueing armed effects. Linear walk — dirtiness spreads one level, never
   * recursing into the subscribers' own subscribers.
   */
  function shallowPropagate(link: Link): void {
    do {
      const sub = link.sub;
      const flags = sub.flags;
      if ((flags & (PENDING | DIRTY)) === PENDING) {
        sub.flags = flags | DIRTY;
        if ((flags & (WATCHING | RECURSED_CHECK)) === WATCHING) {
          host.notify(sub);
        }
      }
    } while ((link = link.nextSub!) !== undefined);
  }

  /** Walks `sub`'s live dependency tail looking for `checkLink` — recursion dedup for propagate. */
  function isValidLink(checkLink: Link, sub: ReactiveNode): boolean {
    let link = sub.depsTail;
    while (link !== undefined) {
      if (link === checkLink) {
        return true;
      }
      link = link.prevDep;
    }
    return false;
  }
}

// Host callbacks the graph machinery dispatches through — bound once at scheduler.ts
// module init via setSystemHost so this module never imports scheduler values (cycle
// break, the setDeferredAdopters pattern). Definite-assignment trust: scheduler evaluates
// before any consumer can invoke a graph function.
const host = {} as ReactiveHost;

/**
 * @internal Binds the scheduler-owned host callbacks (`update`, `notify`, `unwatched`) the
 * five graph functions dispatch through. Runs once at `lib/internal/scheduler.ts` module
 * init — before any consumer can invoke a graph function.
 * @param callbacks The queue/disposal callbacks owned by the scheduler.
 */
export function setSystemHost(callbacks: ReactiveHost): void {
  host.update = callbacks.update;
  host.notify = callbacks.notify;
  host.unwatched = callbacks.unwatched;
}

/**
 * @internal Links `dep` as a dependency of `sub` (creating or reusing an edge).
 */
export const { link, unlink, propagate, checkDirty, shallowPropagate } = createReactiveSystem(host);
