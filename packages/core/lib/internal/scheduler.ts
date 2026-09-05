import type { Reactive, Link } from "./links";
import type { EffectState } from "../effect";
import type { SignalState } from "../signal";
import type { ComputedState } from "../computed";
import { CLEAN, GUARDED, TRACKING, DIRTY, PENDING, EFFECT_DEP, SIGNAL_DEPS, SCHEDULED, WRITABLE } from "./flags";
import { setCurrentSub } from "./context";
import { endTracking } from "./tracking";
import { removeLink } from "./links";
import { updateValue } from "./execution";
import { isFunction } from "./utils";

/**
 * Represents a node in a stack data structure.
 * @template T
 */
interface Stack<T> {
  sv: T;
  sp: Stack<T> | undefined;
}

/** Queue to store effects that need to be executed during flush. */
const effectQueue: (EffectState | undefined)[] = [];

/** Index of next effect to process and total count of queued effects. */
let queueIndex = 0, effectCount = 0;

/**
 * Schedules an effect to be run synchronously during the next flush.
 * @param effectValue The effect to schedule.
 */
function scheduleEffect(effectValue: EffectState): void {
  const { rf } = effectValue;
  if (!(rf & SCHEDULED)) {
    effectValue.rf = rf | SCHEDULED;
    effectQueue[effectCount++] = effectValue;
  }
}

/** Mask for active processing states: tracking, dirty, or pending. */
const ACTIVE_FLAGS = TRACKING | DIRTY | PENDING;

/**
 * @internal Propagates the dirty flag to all subscribers of a reactive node.
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
      rf & GUARDED && scheduleEffect(lt as EffectState); // Schedule effects for execution
    }
    link = lns!; // Move to next subscriber
  }
}

/**
 * @internal Propagates a change notification through the reactive graph.
 * @param link The starting link of subscribers.
 */
export function propagateChange(link: Link): void {
  let { lns } = link; // Next sibling link to process
  let stack: Stack<Link | undefined> | undefined; // Stack for depth-first traversal

  process: do {
    const { lt } = link; // Target node of current link
    let rf = lt.rf; // Flags of target
    const { rs } = lt; // Subscribers of target (never reassigned)

    // Only process writable signals and guarded effects
    if (rf & (WRITABLE | GUARDED)) {
      // Mark clean nodes as PENDING; set local rf to CLEAN for already-processing nodes to skip re-scheduling.
      // Signals-only effects take DIRTY up front: their sources' writes already proved the
      // value changed, so flush runs them without stale validation
      if (!(rf & ACTIVE_FLAGS)) {
        lt.rf = rf | PENDING | (rf & SIGNAL_DEPS ? DIRTY : 0);
      } else {
        rf = CLEAN;
      }

      // Schedule guarded effects (effects with GUARDED flag) for execution
      rf & GUARDED && scheduleEffect(lt as EffectState);

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

/**
 * @internal Validates the dependency graph of a subscriber to see if it is stale.
 * @param link The starting dependency link.
 * @param subscriber The subscriber to validate.
 * @returns True if the subscriber is stale.
 */
export function validateStale(link: Link, subscriber: Reactive): boolean {
  let stack: Stack<Link> | undefined, depth = 0; // Stack for nested validation traversal
  let isStale = !!(subscriber.rf & DIRTY); // Staleness is carried, not re-derived — subscribers only gain DIRTY from this walk's own propagate calls

  do {
    const { ls, lnd } = link; // Source and next dependency (prev-subscriber loaded only on the dive path)
    const rf = ls.rf; // Source flags (subscribers loaded only where used)

    if (!isStale) {
      // If source is writable and dirty, update it and check for changes
      if ((rf & (WRITABLE | DIRTY)) === (WRITABLE | DIRTY)) {
        if (updateValue(ls as SignalState | ComputedState)) {
          const { rs } = ls;
          rs?.lns && propagate(rs); // Propagate changes to other subscribers
          isStale = true; // Mark as stale if value changed
        }
      }
      // If source is writable and pending, dive deeper to validate its dependencies
      else if ((rf & (WRITABLE | PENDING)) === (WRITABLE | PENDING)) {
        // Push current context to stack if source has subscribers or previous links
        stack = ls.rs || link.lps ? { sv: link, sp: stack } : stack;
        link = ls.rd!; // Move to source's first dependency
        subscriber = ls; // Source becomes new subscriber to validate (PENDING only — the DIRTY arm above failed)
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
      const { lt } = link; // Target and next dependency of link

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

/**
 * Executes an effect if it is stale.
 * @param effectValue The effect to execute.
 * @param flags The current flags of the effect.
 */
function executeEffect(effectValue: EffectState, flags: number): void {
  // Execute if dirty or pending with stale dependencies
  if (
    flags & DIRTY // Definitely dirty
    || (flags & PENDING && validateStale(effectValue.rd!, effectValue)) // Maybe dirty - validate
  ) {
    // Call cleanup return value from previous execution
    effectValue.ec?.();
    const prevSub = setCurrentSub(effectValue); // Set reactive context for dependency tracking
    // Effects carry no transient bits here (SCHEDULED cleared pre-call, DIRTY/PENDING just
    // validated), so the flag word is rebuilt from constants — preserving the persistent
    // bits an effect can carry (EFFECT_DEP child links, SIGNAL_DEPS fast path)
    effectValue.rf = (flags & (EFFECT_DEP | SIGNAL_DEPS)) | GUARDED | TRACKING;
    effectValue.rpd = undefined; // Reset dependency traversal pointer for fresh tracking

    try {
      // Capture cleanup return value from effect function
      const result = effectValue.ef();
      effectValue.ec = isFunction(result) ? result : undefined;
    } finally {
      setCurrentSub(prevSub); // Restore previous reactive context
      endTracking(effectValue); // Clean up unused dependencies from previous execution
    }

    return; // Early return - effect was executed
  }

  // If pending but not stale, just clear the pending flag
  flags & PENDING && (effectValue.rf = flags & ~PENDING);

  // Process scheduled child effects in dependency order — only when at least one child
  // effect link exists (leaf effects skip the walk entirely). The flags snapshot is
  // accurate here: the skip path never runs ef, so no child links can appear post-snapshot
  if (flags & EFFECT_DEP) {
    let { rd } = effectValue;

    while (rd) {
      const { ls, lnd } = rd;
      const { rf } = ls;
      // Execute scheduled dependencies recursively
      rf & SCHEDULED && executeEffect(ls as EffectState, ls.rf = rf & ~SCHEDULED);
      rd = lnd; // Move to next dependency
    }
  }
}

/**
 * @internal Drains the scheduled-effect queue: each effect's SCHEDULED bit clears at
 * dequeue (slot cleared for GC), then it executes. Effects scheduled during the drain
 * are appended and run in the same pass. A throw aborts the drain with the remaining
 * entries intact — the next flush recovers them.
 */
export function flush(): void {
  while (queueIndex < effectCount) {
    const effectValue = effectQueue[queueIndex]!;
    effectQueue[queueIndex++] = undefined; // Clear queue slot for GC
    effectValue.rf &= ~SCHEDULED; // Clear SCHEDULED flag
    executeEffect(effectValue, effectValue.rf);
  }
  queueIndex = effectCount = 0;
}

/**
 * @internal Disposes of an effect, removing all its dependencies and subscriptions.
 * @param effect The effect to dispose.
 */
export function disposeEffect(effect: EffectState): void {
  // Run cleanup return value if it exists
  effect.ec?.();
  // Remove all outgoing dependency links (what this effect depends on)
  let dep = effect.rd;
  while (dep) dep = removeLink(dep, effect);
  effect.rd = undefined;
  // Remove incoming subscription links (what depends on this effect)
  effect.rs && removeLink(effect.rs, effect);
  effect.rf = CLEAN; // Mark as clean/disposed
}
