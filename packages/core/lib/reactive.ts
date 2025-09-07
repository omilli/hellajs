import type {
  Stack,
  Reactive,
  Link,
  EffectValue,
  SignalBase,
  ComputedBase
} from './types'
import { F, SCHEDULED } from './types'
import { startTracking, endTracking } from './tracking'

/** Queue to store effects that need to be executed during flush. */
const effectQueue: (EffectValue | Reactive | undefined)[] = [];

/** The currently executing reactive context (effect or computed). */
export let currentValue: Reactive | undefined;

/** Index of next effect to process and total count of queued effects. */
let queueIndex = 0, effectCount = 0;

/**
 * Performs deep equality comparison between two values.
 * Handles primitives, arrays, objects, Maps, and Sets recursively.
 * @param a First value to compare.
 * @param b Second value to compare.
 * @returns True if values are deeply equal.
 */
const deepEqual = (a: unknown, b: unknown): boolean => {
  // Fast path: identical references or values
  if (a === b) return true;

  const A = typeof a;
  // All primitives except objects are compared by reference above
  if (
    A === 'string' ||
    A === 'number' ||
    A === 'boolean' ||
    A === 'undefined' ||
    A === 'symbol' ||
    A === 'bigint'
  ) return false;

  // Handle null separately since typeof null === 'object'
  if (a === null) return b === null;

  // If b is not an object or is null, they can't be equal
  if (typeof b !== 'object' || b === null) return false;

  // Handle arrays recursively
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    // Compare each element deeply
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // If a is not array but b is, they're different
  if (Array.isArray(b)) return false;

  // Different constructors means different types
  if ((a as object).constructor !== (b as object).constructor) return false;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  // Different number of keys means different objects
  if (keysA.length !== keysB.length) return false;

  // Compare each key-value pair recursively
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual((a as any)[key], (b as any)[key])) return false;
  }

  // Handle Map collections
  if (isMap(a)) {
    if (!isMap(b) || a.size !== b.size) return false;
    // Compare each map entry deeply
    for (const [key, value] of a)
      if (!b.has(key) || !deepEqual(value, b.get(key))) return false;
    return true;
  }

  // Handle Set collections
  if (isSet(a)) {
    if (!isSet(b) || a.size !== b.size) return false;
    // Check that all values exist in both sets
    for (const value of a)
      if (!b.has(value)) return false;
    return true;
  }

  return true;
}

/**
 * Executes a signal update, storing the new value and checking for changes.
 * @param signalValue The signal to execute.
 * @param value The new value to store.
 * @returns True if the value actually changed.
 */
export const executeSignal = (signalValue: SignalBase, value: unknown): boolean => {
  signalValue.rf = F.W; // Reset to writable state
  const oldValue = signalValue.sbv;
  signalValue.sbv = value; // Update the base value
  // Only return true if value actually changed (triggers propagation)
  return !deepEqual(oldValue, value);
}

/**
 * Executes a computed signal's getter function and updates its cached value.
 * @template T
 * @param computedValue The computed signal to execute.
 * @returns True if the computed value changed.
 */
export const executeComputed = <T = unknown>(computedValue: ComputedBase<T>): boolean => {
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
export const setCurrentSub = (sub: Reactive | undefined) => {
  const prev = currentValue;
  currentValue = sub;
  return prev;
}

/**
 * Propagates the dirty flag to all subscribers of a reactive node.
 * @param link The starting link of subscribers to propagate to.
 */
export const propagate = (link: Link): void => {
  // Walk through all subscribers in the linked list
  while (link) {
    const { lt, lns } = link; // Target node and next subscriber
    const { rf } = lt;

    // If only pending (not dirty), mark as dirty
    if ((rf & (F.P | F.D)) === F.P) {
      lt.rf = rf | F.D; // Upgrade from pending to dirty
      rf & F.G && scheduleEffect(lt); // Schedule effects for execution
    }
    link = lns!; // Move to next subscriber
  }
}

/**
 * Propagates a change notification through the reactive graph.
 * @param link The starting link of subscribers.
 */
export const propagateChange = (link: Link): void => {
  let { lns } = link; // Next sibling link to process
  let stack: Stack<Link | undefined> | undefined; // Stack for depth-first traversal

  process: do {
    const { lt } = link; // Target node of current link
    let { rf, rs } = lt; // Flags and subscribers of target

    // Only process writable signals and guarded effects
    if (rf & (F.W | F.G)) {
      const m1 = F.T | F.M, m2 = m1 | F.D | F.P;

      // State machine: mark as pending if clean, or clean if already computing
      (!(rf & m2)) ? (lt.rf = rf | F.P) : rf = F.C;

      // Schedule guarded effects (effects with F.G flag) for execution
      rf & F.G && scheduleEffect(lt);

      // For writable signals, traverse their subscribers depth-first
      if (rf & F.W && rs) {
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
export const validateStale = (link: Link, subscriber: Reactive): boolean => {
  let stack: Stack<Link> | undefined, depth = 0; // Stack for nested validation traversal

  validate: do {
    const { ls, lps, lnd } = link; // Source, prev subscriber, next dependency
    const { rf, rs } = ls; // Source flags and subscribers

    // Check if subscriber is already known to be stale
    let isStale = !!(subscriber.rf & F.D);

    if (!isStale) {
      // If source is writable and dirty, update it and check for changes
      if ((rf & (F.W | F.D)) === (F.W | F.D)) {
        if (updateValue(ls as SignalBase | ComputedBase)) {
          rs?.lns && propagate(rs); // Propagate changes to other subscribers
          isStale = true; // Mark as stale if value changed
        }
      } 
      // If source is writable and pending, dive deeper to validate its dependencies
      else if ((rf & (F.W | F.P)) === (F.W | F.P)) {
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
      if (isStale && updateValue(subscriber as SignalBase | ComputedBase)) {
        hasManySubs && propagate(firstSub); // Notify other subscribers
        subscriber = lt; // Move to link target
        continue; // Continue validation
      } else {
        subscriber.rf &= ~F.P; // Clear pending flag if not stale
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
export const flush = (): void => {
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
 * Updates the value of a signal or computed signal using polymorphic dispatch.
 * @param value The reactive node to update.
 * @returns True if the value changed.
 */
const updateValue = (value: SignalBase | ComputedBase): boolean => {
  // Polymorphic dispatch: computed has cbf (compute function), signal doesn't
  return (value as ComputedBase).cbf 
    ? executeComputed(value as ComputedBase)
    : executeSignal(value as SignalBase, (value as SignalBase).sbc);
}

/**
 * Schedules an effect to be run synchronously during the next flush.
 * @param effectValue The effect to schedule.
 */
const scheduleEffect = (effectValue: EffectValue | Reactive) => {
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
const executeEffect = (effectValue: EffectValue | Reactive, flags: number): void => {
  // Execute if dirty or pending with stale dependencies
  if (
    flags & F.D // Definitely dirty
    || (flags & F.P && validateStale(effectValue.rd!, effectValue)) // Maybe dirty - validate
  ) {
    const prevSub = setCurrentSub(effectValue); // Set reactive context for dependency tracking
    startTracking(effectValue); // Begin fresh dependency tracking

    try {
      (effectValue as EffectValue).ef(); // Execute effect function with automatic tracking
    } finally {
      setCurrentSub(prevSub); // Restore previous reactive context
      endTracking(effectValue); // Clean up unused dependencies from previous execution
    }

    return; // Early return - effect was executed
  }

  // If pending but not stale, just clear the pending flag
  flags & F.P && (effectValue.rf = flags & ~F.P);

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

/**
 * Type guard to check if a value is a Set instance.
 * @param val The value to check.
 * @returns True if val is a Set.
 */
const isSet = (val: unknown): val is Set<unknown> => val instanceof Set;

/**
 * Type guard to check if a value is a Map instance.
 * @param val The value to check.
 * @returns True if val is a Map.
 */
const isMap = (val: unknown): val is Map<unknown, unknown> => val instanceof Map;
