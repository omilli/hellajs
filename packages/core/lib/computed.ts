import { currentValue, executeComputed, propagate, validateStale } from "./reactive";
import { createLink } from "./links";
import { Flags, type ComputedBase } from "./types";

/**
 * Creates a read-only signal that automatically updates when its dependencies change.
 * @template T
 * @param getter The function to compute the value.
 * @returns A function that returns the computed value.
 */
export function computed<T>(getter: (previousValue?: T) => T): () => T {
  const computedValue: ComputedBase<T> = {
    cachedVal: undefined,
    subs: undefined,
    prevSub: undefined,
    deps: undefined,
    prevDep: undefined,
    flags: Flags.W | Flags.D,
    compFn: getter,
  };

  return function () {
    const { flags, deps, subs } = computedValue;
    // Check if dirty or pending with stale dependencies
    const flagged = (flags & Flags.D || (flags & Flags.P && validateStale(deps!, computedValue)));

    if (flagged && executeComputed(computedValue) && subs) {
      propagate(subs); // Notify dependent computeds/effects
    } else if (flags & Flags.P) {
      computedValue.flags = flags & ~Flags.P; // Clear pending flag if not stale
    }

    // Track this computed as a dependency if we're inside a reactive context
    if (currentValue) {
      createLink(computedValue, currentValue);
    }

    return computedValue.cachedVal!;
  };
}