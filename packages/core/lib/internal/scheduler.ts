import type { Link, ReactiveNode } from "./system";
import { unlink, checkDirty, setSystemHost } from "./system";
import type { EffectNode } from "../effect";
import type { SignalNode } from "../signal";
import type { ComputedNode } from "../computed";
import type { FlushErrorHandler } from "../types";
import { NONE, MUTABLE, WATCHING, RECURSED_CHECK, DIRTY, PENDING, SIGNAL_DEPS } from "./flags";
import { setCurrentSub } from "./context";
import { purgeDeps } from "./tracking";
import { updateSignal, updateComputed } from "./execution";
import { isFunction } from "./utils";

/** Queue of effects awaiting execution during the next flush. */
const effectQueue: (ReactiveNode | undefined)[] = [];

/** Index of the next effect to run and the total number of queued effects. */
let queueIndex = 0,
  queuedLength = 0;

/** Whether a microtask drain is already scheduled for the current tick. */
let flushScheduled = false;

/** Whether a drain pass is currently executing; writes inside it append to the same pass. */
let draining = false;

/** Handler for scheduled-drain errors; undefined restores the rethrow path. */
let flushErrorHandler: FlushErrorHandler | undefined;

/**
 * Sets the handler invoked when a scheduled (microtask) drain aborts on a
 * thrown error. Manual `flush()` calls never dispatch — they throw to their
 * caller. Passing `null` unregisters, restoring the rethrow path where the
 * error surfaces as an unhandled microtask rejection.
 * @param handler The handler to register, or `null` to unregister.
 */
export function setFlushErrorHandler(handler: FlushErrorHandler | null): void {
  flushErrorHandler = handler ?? undefined;
}

/**
 * @internal Host `update` callback: re-evaluates a mutable node, dispatching on
 * node kind. Effects never carry MUTABLE, so only the two value kinds arrive.
 * @param node The computed or signal to re-evaluate.
 * @returns True if the committed value changed.
 */
export function update(node: ReactiveNode): boolean {
  return "getter" in node ? updateComputed(node as ComputedNode) : updateSignal(node as SignalNode);
}

/**
 * @internal Host `notify` callback: appends an effect to the flush queue. Queue
 * dedup is the WATCHING bit — notify clears it, and callers only notify WATCHING
 * nodes, so an effect is never queued twice. A SIGNAL_DEPS effect takes DIRTY
 * here: the write that reached it already proved change, so flush runs it
 * without stale validation.
 *
 * No ancestor walk: parents order through their own dependency writes (a write
 * inside the parent's run appends the parent after the direct subscribers),
 * which is the ordering the existing suites pin. Pulling ancestors into the queue at the
 * child's position would run a parent gate ahead of same-write direct
 * subscribers that sit later in the subscription list — the vendored walk fits
 * vendored's own disposal semantics, not this host's.
 *
 * @param effect The armed effect to queue.
 */
export function notify(effect: ReactiveNode): void {
  effect.flags & SIGNAL_DEPS && (effect.flags |= DIRTY);
  effectQueue[queuedLength++] = effect;
  effect.flags &= ~WATCHING;
}

/**
 * @internal Host `unwatched` callback: a node lost its last subscriber. Only
 * computeds react — marked for lazy rebuild and fully detached from their own
 * dependencies (cascading into dep computeds that lose their last subscriber).
 * Signals hold nothing to release. Effects deliberately no-op: a nested effect
 * whose parent unlinked it stays alive and keeps firing on its own dependencies
 * until explicitly disposed.
 * @param node The node whose last subscriber went away.
 */
export function unwatched(node: ReactiveNode): void {
  if ("getter" in node) {
    const computedNode = node as ComputedNode;
    const depsTail = computedNode.depsTail;
    if (depsTail !== undefined) {
      computedNode.flags = MUTABLE | DIRTY; // lazy rebuild on next read
      let link: Link | undefined = depsTail;
      while (link !== undefined) {
        const previous: Link | undefined = link.prevDep;
        unlink(link, computedNode);
        link = previous;
      }
    }
  }
}

// Registration breaks the circular import (setDeferredAdopters pattern): the graph
// machinery dispatches through these callbacks, so system.ts must not import them.
setSystemHost({ update, notify, unwatched });

/**
 * Runs an effect if it is stale — the vendored `run` minus the child-effect
 * tail-walk (nested effects accumulate; nothing auto-disposes).
 * @param effect The effect to run.
 * @param flags The flag snapshot taken at dequeue.
 */
function executeEffect(effect: EffectNode, flags: number): void {
  // Execute if dirty, or pending with stale dependencies
  if (flags & DIRTY || (flags & PENDING && checkDirty(effect.deps!, effect))) {
    // Run the cleanup returned by the previous execution, with dependency tracking
    // suspended so reads inside the cleanup never subscribe the effect to anything
    if (effect.cleanup) {
      const cleanup = effect.cleanup;
      effect.cleanup = undefined;
      const previousCleanupSub = setCurrentSub(undefined);
      try {
        cleanup();
      } finally {
        setCurrentSub(previousCleanupSub);
      }
      if (!effect.flags) return; // cleanup disposed the effect — nothing to re-run
    }
    effect.depsTail = undefined;
    // Effects carry no transient bits here (WATCHING cleared at queue time, DIRTY/PENDING
    // just validated), so the flag word is rebuilt from constants — preserving the
    // persistent SIGNAL_DEPS fast path
    effect.flags = WATCHING | RECURSED_CHECK | (flags & SIGNAL_DEPS);
    const previousSub = setCurrentSub(effect);

    try {
      // Capture cleanup return value from effect function
      const result = effect.fn();
      effect.cleanup = isFunction(result) ? result : undefined;
    } finally {
      setCurrentSub(previousSub); // Restore previous reactive context
      effect.flags &= ~RECURSED_CHECK;
      purgeDeps(effect); // Clean up unused dependencies from the previous execution
    }

    return; // Early return - effect was executed
  }

  // Validated clean — re-arm the effect and drop its pending state. Unconditional
  // for effects with dependencies: notify's ancestor walk queues parents with no
  // DIRTY/PENDING at all, and a skipped dequeue must restore WATCHING or the effect
  // is never notified again
  effect.deps !== undefined && (effect.flags = WATCHING | (flags & SIGNAL_DEPS));
}

/**
 * @internal Schedules one microtask drain of the effect queue: consecutive
 * synchronous writes coalesce into a single effect pass at the microtask
 * boundary. No-op while a drain is already scheduled or executing — writes
 * inside an effect body during a drain append to the current pass (no nested
 * drain, no re-schedule).
 *
 * A throw from the drain routes through the handler registered with
 * {@link setFlushErrorHandler} when one is registered: `flush()` has already
 * aborted by then (indices untouched — survivors recover on the next flush;
 * `draining` reset in its finally), so the handler runs against settled state
 * and its own writes schedule a fresh drain. No handler registered → rethrow,
 * surfacing as an unhandled microtask rejection.
 */
export function scheduleFlush(): void {
  if (flushScheduled || draining) return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    try {
      flush();
    } catch (error) {
      if (flushErrorHandler === undefined) throw error;
      flushErrorHandler(error);
    }
  });
}

/**
 * Drains the effect queue synchronously (flushSync semantics): each dequeue
 * clears its slot (GC), then the effect runs. Effects queued during the drain
 * are appended and run in the same pass. A throw aborts the drain with the
 * remaining entries intact — the indices only reset on a completed pass, so
 * the next `flush` recovers the survivors.
 */
export function flush(): void {
  if (draining) return; // A pass is already running and owns the shared indices
  draining = true;
  try {
    while (queueIndex < queuedLength) {
      const effect = effectQueue[queueIndex]!;
      effectQueue[queueIndex++] = undefined; // Clear queue slot for GC
      // Only notify queues entries, and notify only ever receives armed effects
      executeEffect(effect as EffectNode, effect.flags);
    }
    queueIndex = 0;
    queuedLength = 0;
  } finally {
    draining = false; // The queue must not stay "draining" after a throw
  }
}

/**
 * @internal Disposes of an effect, removing all its dependencies and subscriptions.
 * @param effect The effect to dispose.
 */
export function disposeEffect(effect: EffectNode): void {
  // Run cleanup return value if it exists
  effect.cleanup?.();
  // Remove all outgoing dependency links (what this effect depends on)
  let link = effect.deps;
  while (link !== undefined) {
    link = unlink(link, effect);
  }
  // Remove the incoming subscription link (the parent effect subscribing to this one)
  const sub = effect.subs;
  sub !== undefined && unlink(sub);
  effect.flags = NONE; // Mark as disposed
}
