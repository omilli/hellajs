import { currentValue, executeComputed, propagate, validateStale } from "./reactive";
import { createLink } from "./links";
import { type ComputedState } from "./types";
import { FLAGS } from "./flags";

/**
 * Creates a read-only signal that automatically updates when its dependencies change.
 * @template T
 * @param computeFn The function to compute the value.
 * @returns A function that returns the computed value.
 */
export function computed<T>(computeFn: (previousValue?: T) => T): () => T {
  const computedState: ComputedState<T> = {
    cbc: undefined,
    rs: undefined,
    rps: undefined,
    rd: undefined,
    rpd: undefined,
    rf: FLAGS.W | FLAGS.D,
    cbf: computeFn,
  };

  return () => {
    const { rf, rd, rs } = computedState;
    // Notify dependent computed/effects if dirty or pending with stale dependencies
    (rf & FLAGS.D || (rf & FLAGS.P && validateStale(rd!, computedState))) && executeComputed(computedState) && rs && propagate(rs);
    // Clear pending flag if not stale
    rf & FLAGS.P && (computedState.rf = rf & ~FLAGS.P);
    // Track this computed as a dependency if we're inside a reactive context
    currentValue && createLink(computedState, currentValue);

    return computedState.cbc!;
  };
}