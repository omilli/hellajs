import type {
  Stack,
  Reactive,
  Link,
  EffectValue,
  SignalBase,
  ComputedBase
} from './types'
import { Flags, SCHEDULED } from './types'
import { startTracking, endTracking } from './tracking'

const effectQueue: (EffectValue | Reactive | undefined)[] = [];

export let currentValue: Reactive | undefined;

let queueIndex = 0,
  effectCount = 0;

/**
 * Executes a signal, updating its last known value.
 * @param signalValue The signal to execute.
 * @param value The new value.
 * @returns True if the value changed.
 */
export function executeSignal(signalValue: SignalBase, value: unknown): boolean {
  signalValue.flags = Flags.W;
  return signalValue.lastVal !== (signalValue.lastVal = value);
}

/**
 * Executes a computed signal's getter function and updates its cached value.
 * @template T
 * @param computedValue The computed signal to execute.
 * @returns True if the computed value changed.
 */
export function executeComputed<T = unknown>(computedValue: ComputedBase<T>): boolean {
  const prevSubValue = setCurrentSub(computedValue);
  const { cachedVal, compFn } = computedValue;

  startTracking(computedValue);

  try {
    const prevValue = cachedVal;
    const newValue = compFn(prevValue);

    computedValue.cachedVal = newValue;
    return prevValue !== newValue;
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
  do {
    const { target, nextSub } = link;
    const { flags } = target;

    if ((flags & (Flags.P | Flags.D)) === Flags.P) {
      target.flags = flags | Flags.D;

      if (flags & Flags.G) {
        scheduleEffect(target);
      }
    }

    link = nextSub!;

  } while (link);
}

/**
 * Propagates a change notification through the reactive graph.
 * @param link The starting link of subscribers.
 */
export function propagateChange(link: Link): void {
  let { nextSub } = link;
  let stack: Stack<Link | undefined> | undefined;

  process: do {
    const { target } = link;
    let { flags, subs } = target;

    // Only process writable signals and guarded effects
    if (flags & (Flags.W | Flags.G)) {
      const m1 = Flags.T | Flags.M, m2 = m1 | Flags.D | Flags.P;

      // Mark as pending if not already tracking/computing/dirty/pending
      if (!(flags & m2)) {
        target.flags = flags | Flags.P;
      } else if (!(flags & m1)) {
        flags = Flags.C; // Clean if not tracking/computing
      } else {
        flags = Flags.C; // Clean if tracking/computing
      }

      // Schedule effects for execution
      if (flags & Flags.G) {
        scheduleEffect(target);
      }

      // Traverse subscribers of writable signals depth-first
      if (flags & Flags.W && subs) {
        link = subs;

        // Use stack for multiple subscribers to maintain traversal order
        if (subs.nextSub) {
          stack = { value: nextSub, prev: stack };
          nextSub = link.nextSub;
        }
        continue;
      }
    }

    // Move to next sibling subscriber
    if ((link = nextSub!)) {
      nextSub = link.nextSub;
      continue;
    }

    // Backtrack using stack when no more siblings
    while (stack) {
      link = stack.value!;
      stack = stack.prev;

      if (link) {
        nextSub = link.nextSub;
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
export function validateStale(link: Link, subscriber: Reactive): boolean {
  let stack: Stack<Link> | undefined, depth = 0;

  validate: do {
    const { source, nextSub, prevSub, nextDep } = link;
    const { flags, subs } = source;

    let isStale = !!(subscriber.flags & Flags.D);

    if (!isStale) {
      if ((flags & (Flags.W | Flags.D)) === (Flags.W | Flags.D)) {
        if (updateValue(source as SignalBase | ComputedBase)) {
          if (subs?.nextSub) {
            propagate(subs);
          }
          isStale = true;
        }
      } else if ((flags & (Flags.W | Flags.P)) === (Flags.W | Flags.P)) {
        stack = nextSub || prevSub ? { value: link, prev: stack } : stack;
        link = source.deps!;
        subscriber = source;
        ++depth;
        continue;
      }
    }

    if (!isStale && nextDep) {
      link = nextDep;
      continue;
    }

    while (depth) {
      --depth;
      const firstSub = subscriber.subs!;
      const hasManySubs = !!firstSub.nextSub;

      link = hasManySubs ? stack!.value : firstSub;
      const { target, nextDep } = link;

      if (hasManySubs) {
        stack = stack!.prev;
      }

      if (isStale && updateValue(subscriber as SignalBase | ComputedBase)) {
        if (hasManySubs) {
          propagate(firstSub);
        }
        subscriber = target;
        continue;
      } else {
        subscriber.flags &= ~Flags.P;
      }

      subscriber = target;

      if (nextDep) {
        link = nextDep;
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
export function processQueue(): void {
  while (queueIndex < effectCount) {
    const effectValue = effectQueue[queueIndex];
    effectQueue[queueIndex++] = undefined;

    if (effectValue) {
      executeEffect(effectValue, effectValue.flags &= ~SCHEDULED);
    }
  }

  queueIndex = effectCount = 0;
}

/**
 * Updates the value of a signal or computed signal.
 * @param value The reactive node to update.
 * @returns True if the value changed.
 */
function updateValue(value: SignalBase | ComputedBase): boolean {
  // Polymorphic dispatch: computed has compFn, signal doesn't
  return (value as ComputedBase).compFn ? executeComputed(value as ComputedBase) : executeSignal(value as SignalBase, (value as SignalBase).currentVal);
}

/**
 * Schedules an effect to be run in the next microtask.
 * @param effectValue The effect to schedule.
 */
function scheduleEffect(effectValue: EffectValue | Reactive) {
  const { flags } = effectValue;

  // Avoid duplicate scheduling
  if (!(flags & SCHEDULED)) {
    effectValue.flags = flags | SCHEDULED;
    effectQueue[effectCount++] = effectValue; // Queue for batch processing
  }
}

/**
 * Executes an effect if it is stale.
 * @param effectValue The effect to execute.
 * @param flags The current flags of the effect.
 */
function executeEffect(effectValue: EffectValue | Reactive, flags: number): void {
  // Execute if dirty or pending with stale dependencies
  if (
    flags & Flags.D
    || (flags & Flags.P && validateStale(effectValue.deps!, effectValue))
  ) {
    const prevSub = setCurrentSub(effectValue); // Set reactive context

    startTracking(effectValue); // Begin dependency tracking

    try {
      (effectValue as EffectValue).execFn(); // Execute with automatic tracking
    } finally {
      setCurrentSub(prevSub); // Restore context
      endTracking(effectValue); // Clean up unused dependencies
    }

    return;
  } else if (flags & Flags.P) {
    effectValue.flags = flags & ~Flags.P; // Clear pending flag if not stale
  }

  // Process any scheduled dependent effects
  let { deps } = effectValue;

  while (deps) {
    const { source, nextDep } = deps;
    const { flags } = source;

    if (flags & SCHEDULED) {
      executeEffect(source, source.flags = flags & ~SCHEDULED); // Recursive execution
    }

    deps = nextDep;
  }
}
