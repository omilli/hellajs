import { currentValue, executeComputed, propagate, validateStale } from "./reactive";
import { createLink } from "./links";
import { F, type ComputedBase } from "./types";

/**
 * Creates a read-only signal that automatically updates when its dependencies change.
 * @template T
 * @param getter The function to compute the value.
 * @returns A function that returns the computed value.
 */
export const computed = <T>(getter: (previousValue?: T) => T): () => T => {
  const computedValue: ComputedBase<T> = {
    cbc: undefined,
    rs: undefined,
    rps: undefined,
    rd: undefined,
    rpd: undefined,
    rf: F.W | F.D,
    cbf: getter,
  };

  return () => {
    const { rf, rd, rs } = computedValue;
    // Notify dependent computed/effects if dirty or pending with stale dependencies
    (rf & F.D || (rf & F.P && validateStale(rd!, computedValue))) && executeComputed(computedValue) && rs && propagate(rs);
    // Clear pending flag if not stale
    rf & F.P && (computedValue.rf = rf & ~F.P);
    // Track this computed as a dependency if we're inside a reactive context
    currentValue && createLink(computedValue, currentValue);

    return computedValue.cbc!;
  };
}