import { currentValue } from "./internal/context";
import { executeComputed } from "./internal/execution";
import { propagate } from "./internal/propagation";
import { validateStale } from "./internal/validation";
import { createLink } from "./internal/links";
import { WRITABLE, DIRTY, PENDING } from "./internal/flags";
import { isFunction } from "./internal/utils";
import type { Reactive } from "./internal/links";

/**
 * Base interface for a computed signal.
 * @internal
 * @template T
 */
export interface ComputedState<T = unknown> extends Reactive {
  /** The cached value of the computation. */
  cbc: T | undefined;
  /** The function that computes the value. */
  cbf: (previousValue?: T) => T;
}

/**
 * Creates a read-only signal that automatically updates when its dependencies change.
 * @template T
 * @param computedFn Compute function. Called with the previous value on re-computation.
 * @returns A function that returns the computed value.
 */
export function computed<T>(computedFn: (previousValue?: T) => T): () => T {
  if (!isFunction(computedFn)) {
    throw new Error(`[core] computed: computedFn must be a function, received ${typeof computedFn}`);
  }
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