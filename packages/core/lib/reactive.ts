import type {
  Stack,
  Reactive,
  Link,
  EffectState,
  SignalState,
  ComputedState
} from './types'
import { FLAGS } from './flags'
import { startTracking, endTracking } from './tracking'
import { deepEqual } from './utils';
import { removeLink } from './links';

/** The currently executing reactive context (effect or computed). */
export let currentValue: Reactive | undefined;

/** Queue to store effects that need to be executed during flush. */
const effectQueue: (EffectState | Reactive | undefined)[] = [];

/** Flag to indicate an effect is scheduled to run. */
const SCHEDULED = 128;

/** Index of next effect to process and total count of queued effects. */
let queueIndex = 0, effectCount = 0;

/**
 * Executes a signal update, storing the new value and checking for changes.
 * @param signalValue The signal to execute.
 * @param value The new value to store.
 * @returns True if the value actually changed.
 */
export function executeSignal(signalValue: SignalState, value: unknown): boolean {
  signalValue.rf = FLAGS.W; // Reset to writable state
  const oldValue = signalValue.sbv;
  signalValue.sbv = value; // Update the base value
  // Only return true if value actually changed (triggers propagation)
  return !deepEqual(oldValue, value);
}

/**
 * Executes a computed signal's computedFn function and updates its cached value.
 * @template T
 * @param computedValue The computed signal to execute.
 * @returns True if the computed value changed.
 */
export function executeComputed<T = unknown>(computedValue: ComputedState<T>): boolean {
  const prevSubValue = setCurrentSub(computedValue);
  const { cbc, cbf } = computedValue;

  startTracking(computedValue);

  try {
    const prevValue = cbc;
    const newValue = cbf(prevValue);
    computedValue.cbc = newValue;
    return !deepEqual(prevValue, newValue);
  } finally {
    setCurrentSub(prevSubValue);
    endTracking(computedValue);
  }
}

/**
 * Sets the current reactive subscriber, tracking dependencies.
 * @param sub The subscriber to set as current.
 * @returns The previous subscriber.
 */
export function setCurrentSub(sub: Reactive | undefined) {
  const prev = currentValue;
  currentValue = sub;
  return prev;
}

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
    if ((rf & (FLAGS.P | FLAGS.D)) === FLAGS.P) {
      lt.rf = rf | FLAGS.D; // Upgrade from pending to dirty
      rf & FLAGS.G && scheduleEffect(lt); // Schedule effects for execution
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
    if (rf & (FLAGS.W | FLAGS.G)) {
      const m1 = FLAGS.T | FLAGS.M, m2 = m1 | FLAGS.D | FLAGS.P;

      // State machine: mark as pending if clean, or clean if already computing
      (!(rf & m2)) ? (lt.rf = rf | FLAGS.P) : rf = FLAGS.C;

      // Schedule guarded effects (effects with FLAGS.G flag) for execution
      rf & FLAGS.G && scheduleEffect(lt);

      // For writable signals, traverse their subscribers depth-first
      if (rf & FLAGS.W && rs) {
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
    let isStale = !!(subscriber.rf & FLAGS.D);

    if (!isStale) {
      // If source is writable and dirty, update it and check for changes
      if ((rf & (FLAGS.W | FLAGS.D)) === (FLAGS.W | FLAGS.D)) {
        if (updateValue(ls as SignalState | ComputedState)) {
          rs?.lns && propagate(rs); // Propagate changes to other subscribers
          isStale = true; // Mark as stale if value changed
        }
      }
      // If source is writable and pending, dive deeper to validate its dependencies
      else if ((rf & (FLAGS.W | FLAGS.P)) === (FLAGS.W | FLAGS.P)) {
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
        subscriber.rf &= ~FLAGS.P; // Clear pending flag if not stale
      }

      subscriber = lt; // Move to link target

      // If more dependencies to validate, continue with them
      if (lnd) {
        link = lnd;
        continue validate;
      }

      isStale = false; // Reset stale flag for next level
    }

    return isStale; // Return final staleness result

  } while (true);
}

/**
 * Processes the queue of scheduled effects.
 */
export function flush(): void {
  // Process all queued effects in order
  while (queueIndex < effectCount) {
    const effectValue = effectQueue[queueIndex];
    effectQueue[queueIndex++] = undefined; // Clear queue slot for GC
    // Execute effect if it exists, clearing SCHEDULED flag
    effectValue && executeEffect(effectValue, effectValue.rf &= ~SCHEDULED);
  }

  // Reset queue for next batch
  queueIndex = effectCount = 0;
}


/**
 * Disposes of an effect, removing all its dependencies and subscriptions.
 * @param effect The effect to dispose.
 */
export function disposeEffect(effect: EffectState | Reactive): void {
  // Remove all outgoing dependency links (what this effect depends on)
  effect.rd && (effect.rd = removeLink(effect.rd, effect));
  // Remove incoming subscription links (what depends on this effect)
  effect.rs && removeLink(effect.rs);
  effect.rf = FLAGS.C; // Mark as clean/disposed
}


/**
 * Updates the value of a signal or computed signal using polymorphic dispatch.
 * @param value The reactive node to update.
 * @returns True if the value changed.
 */
const updateValue = (value: SignalState | ComputedState): boolean => {
  // Polymorphic dispatch: computed has cbf (compute function), signal doesn't
  return (value as ComputedState).cbf
    ? executeComputed(value as ComputedState)
    : executeSignal(value as SignalState, (value as SignalState).sbc);
}

/**
 * Schedules an effect to be run synchronously during the next flush.
 * @param effectValue The effect to schedule.
 */
const scheduleEffect = (effectValue: EffectState | Reactive) => {
  const { rf } = effectValue;
  // Avoid duplicate scheduling by checking SCHEDULED flag
  if (!(rf & SCHEDULED)) {
    effectValue.rf = rf | SCHEDULED; // Mark as scheduled
    effectQueue[effectCount++] = effectValue; // Add to queue for batch processing
  }
}

/**
 * Executes an effect if it is stale.
 * @param effectValue The effect to execute.
 * @param flags The current flags of the effect.
 */
const executeEffect = (effectValue: EffectState | Reactive, flags: number): void => {
  // Execute if dirty or pending with stale dependencies
  if (
    flags & FLAGS.D // Definitely dirty
    || (flags & FLAGS.P && validateStale(effectValue.rd!, effectValue)) // Maybe dirty - validate
  ) {
    const prevSub = setCurrentSub(effectValue); // Set reactive context for dependency tracking
    startTracking(effectValue); // Begin fresh dependency tracking

    try {
      (effectValue as EffectState).ef(); // Execute effect function with automatic tracking
    } finally {
      setCurrentSub(prevSub); // Restore previous reactive context
      endTracking(effectValue); // Clean up unused dependencies from previous execution
    }

    return; // Early return - effect was executed
  }

  // If pending but not stale, just clear the pending flag
  flags & FLAGS.P && (effectValue.rf = flags & ~FLAGS.P);

  // Process any scheduled dependent effects in dependency order
  let { rd } = effectValue;

  while (rd) {
    const { ls, lnd } = rd;
    const { rf } = ls;
    // Execute scheduled dependencies recursively
    rf & SCHEDULED && executeEffect(ls, ls.rf = rf & ~SCHEDULED);
    rd = lnd; // Move to next dependency
  }
}