import { currentValue, executeComputed, propagate, validateStale, createLink, WRITABLE, DIRTY, PENDING } from "../internal";
import { type ComputedState } from "../types";

/**
 * Creates a read-only signal that automatically updates when its dependencies change.
 * @template T
 * @param computedFn The function to compute the value.
 * @returns A function that returns the computed value.
 */
export function computed<T>(computedFn: (previousValue?: T) => T): () => T {
  const computedState: ComputedState<T> = {
    cbc: undefined,
    rs: undefined,
    rps: undefined,
    rd: undefined,
    rpd: undefined,
    rf: WRITABLE | DIRTY,
    cbf: computedFn,
  };

  return () => {
    const { rf, rd, rs } = computedState;
    // Notify dependent computed/effects if dirty or pending with stale dependencies
    (rf & DIRTY || (rf & PENDING && validateStale(rd!, computedState))) && executeComputed(computedState) && rs && propagate(rs);
    // Clear pending flag if not stale
    rf & PENDING && (computedState.rf = rf & ~PENDING);
    // Track this computed as a dependency if we're inside a reactive context
    currentValue && createLink(computedState, currentValue);

    return computedState.cbc!;
  };
}