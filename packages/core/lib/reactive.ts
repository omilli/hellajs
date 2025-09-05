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

const effectQueue: (EffectValue | Reactive | undefined)[] = [];

export let currentValue: Reactive | undefined;

let queueIndex = 0, effectCount = 0;

/**
 * Executes a signal, updating its last known value.
 * @param signalValue The signal to execute.
 * @param value The new value.
 * @returns True if the value changed.
 */
/**
 * Performs deep equality comparison between two values.
 * @param a First value to compare.
 * @param b Second value to compare.
 * @returns True if values are deeply equal.
 */
const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;

  const A = typeof a;
  if (
    A === 'string' ||
    A === 'number' ||
    A === 'boolean' ||
    A === 'undefined' ||
    A === 'symbol' ||
    A === 'bigint'
  ) return false;

  if (a === null) return b === null;

  if (typeof b !== 'object' || b === null) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (Array.isArray(b)) return false;

  if ((a as object).constructor !== (b as object).constructor) return false;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual((a as any)[key], (b as any)[key])) return false;
  }

  if (isMap(a)) {
    if (!isMap(b) || a.size !== b.size) return false;
    for (const [key, value] of a)
      if (!b.has(key) || !deepEqual(value, b.get(key))) return false;
    return true;
  }

  if (isSet(a)) {
    if (!isSet(b) || a.size !== b.size) return false;
    for (const value of a)
      if (!b.has(value)) return false;
    return true;
  }

  return true;
}

export const executeSignal = (signalValue: SignalBase, value: unknown): boolean => {
  signalValue.rf = F.W;
  const oldValue = signalValue.sbv;
  signalValue.sbv = value;
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
  while (link) {
    const { lt, lns } = link;
    const { rf } = lt;

    if ((rf & (F.P | F.D)) === F.P) {
      lt.rf = rf | F.D;
      rf & F.G && scheduleEffect(lt);
    }
    link = lns!;
  }
}

/**
 * Propagates a change notification through the reactive graph.
 * @param link The starting link of subscribers.
 */
export const propagateChange = (link: Link): void => {
  let { lns } = link;
  let stack: Stack<Link | undefined> | undefined;

  process: do {
    const { lt } = link;
    let { rf, rs } = lt;

    // Only process writable signals and guarded effects
    if (rf & (F.W | F.G)) {
      const m1 = F.T | F.M, m2 = m1 | F.D | F.P;

      // Mark as pending if not already tracking/computing/dirty/pending
      // Or Clean if tracking/computing
      (!(rf & m2)) ? (lt.rf = rf | F.P) : rf = F.C;

      // Schedule effects for execution
      rf & F.G && scheduleEffect(lt);

      // Traverse subscribers of writable signals depth-first
      if (rf & F.W && rs) {
        link = rs;

        // Use stack for multiple subscribers to maintain traversal order
        if (rs.lns) {
          stack = { sv: lns, sp: stack };
          lns = rs.lns;
        }
        continue;
      }
    }

    // Move to next sibling subscriber
    if ((link = lns!)) {
      lns = link.lns;
      continue;
    }

    // Backtrack using stack when no more siblings
    if (stack) {
      link = stack.sv!;
      stack = stack.sp;

      if (link) {
        lns = link.lns;
        continue process;
      }
    }
    break;
  } while (true);
}

/**
 * Validates the dependency graph of a subscriber to see if it is stale.
 * @param link The starting dependency link.
 * @param subscriber The subscriber to validate.
 * @returns True if the subscriber is stale.
 */
export const validateStale = (link: Link, subscriber: Reactive): boolean => {
  let stack: Stack<Link> | undefined, depth = 0;

  validate: do {
    const { ls, lps, lnd } = link;
    const { rf, rs } = ls;

    let isStale = !!(subscriber.rf & F.D);

    if (!isStale) {
      if ((rf & (F.W | F.D)) === (F.W | F.D)) {
        if (updateValue(ls as SignalBase | ComputedBase)) {
          rs?.lns && propagate(rs);
          isStale = true;
        }
      } else if ((rf & (F.W | F.P)) === (F.W | F.P)) {
        stack = rs || lps ? { sv: link, sp: stack } : stack;
        link = ls.rd!;
        subscriber = ls;
        ++depth;
        continue;
      }
    }

    if (!isStale && lnd) {
      link = lnd;
      continue;
    }

    while (depth) {
      --depth;
      const firstSub = subscriber.rs!;
      const hasManySubs = !!firstSub.lns;

      link = hasManySubs ? stack!.sv : firstSub;
      const { lt, lnd } = link;

      hasManySubs && (stack = stack!.sp);

      if (isStale && updateValue(subscriber as SignalBase | ComputedBase)) {
        hasManySubs && propagate(firstSub);
        subscriber = lt;
        continue;
      } else {
        subscriber.rf &= ~F.P;
      }

      subscriber = lt;

      if (lnd) {
        link = lnd;
        continue validate;
      }

      isStale = false;
    }

    return isStale;

  } while (true);
}

/**
 * Processes the queue of scheduled effects.
 */
export const flush = (): void => {
  while (queueIndex < effectCount) {
    const effectValue = effectQueue[queueIndex];
    effectQueue[queueIndex++] = undefined;
    effectValue && executeEffect(effectValue, effectValue.rf &= ~SCHEDULED);
  }

  queueIndex = effectCount = 0;
}

/**
 * Updates the value of a signal or computed signal.
 * @param value The reactive node to update.
 * @returns True if the value changed.
 */
const updateValue = (value: SignalBase | ComputedBase): boolean => {
  // Polymorphic dispatch: computed has compFn, signal doesn't
  return (value as ComputedBase).cbf ? executeComputed(value as ComputedBase) : executeSignal(value as SignalBase, (value as SignalBase).sbc);
}

/**
 * Schedules an effect to be run in the next microtask.
 * @param effectValue The effect to schedule.
 */
const scheduleEffect = (effectValue: EffectValue | Reactive) => {
  const { rf } = effectValue;
  // Avoid duplicate scheduling
  if (!(rf & SCHEDULED)) {
    effectValue.rf = rf | SCHEDULED;
    effectQueue[effectCount++] = effectValue; // Queue for batch processing
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
    flags & F.D
    || (flags & F.P && validateStale(effectValue.rd!, effectValue))
  ) {
    const prevSub = setCurrentSub(effectValue); // Set reactive context
    startTracking(effectValue); // Begin dependency tracking

    try {
      (effectValue as EffectValue).ef(); // Execute with automatic tracking
    } finally {
      setCurrentSub(prevSub); // Restore context
      endTracking(effectValue); // Clean up unused dependencies
    }

    return;
  }

  flags & F.P && (effectValue.rf = flags & ~F.P); // Clear pending flag if not stale

  // Process any scheduled dependent effects
  let { rd } = effectValue;

  while (rd) {
    const { ls, lnd } = rd;
    const { rf } = ls;
    rf & SCHEDULED && executeEffect(ls, ls.rf = rf & ~SCHEDULED); // Recursive execution
    rd = lnd;
  }
}

const isSet = (val: unknown): val is Set<unknown> => val instanceof Set;
const isMap = (val: unknown): val is Map<unknown, unknown> => val instanceof Map;
