import { currentValue } from "./internal/context";
import { executeComputed } from "./internal/execution";
import { propagate } from "./internal/propagation";
import { validateStale } from "./internal/validation";
import { createLink } from "./internal/links";
import { WRITABLE, DIRTY, PENDING } from "./internal/flags";
import { isFunction } from "./internal/utils";
import type { Reactive } from "./internal/links";
import type { EqualsOptions } from "./types";

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
  /** Optional equality comparator; an equal result keeps the old reference and stops propagation. */
  ce?: (oldValue: T, newValue: T) => boolean;
}

/**
 * Creates a read-only signal that automatically updates when its dependencies change.
 * @template T
 * @param computedFn Compute function. Called with the previous value on re-computation.
 * @returns A function that returns the computed value.
 * @throws {Error} When computedFn is not a function.
 */
export function computed<T>(computedFn: (previousValue?: T) => T): () => T;
/**
 * Creates a read-only signal with an equality override.
 * When `equals` returns `true`, the recomputed result is treated as unchanged: the old reference is kept and downstream subscribers are not notified.
 * @template T
 * @param computedFn Compute function. Called with the previous value on re-computation.
 * @param options Options with an optional `equals` comparator replacing the default equality check (`===`, with `NaN` equal to itself).
 * @returns A function that returns the computed value.
 * @throws {Error} When computedFn is not a function, or `options.equals` is present and not a function.
 */
export function computed<T>(computedFn: (previousValue?: T) => T, options: EqualsOptions<T>): () => T;
export function computed<T>(computedFn: (previousValue?: T) => T, options?: EqualsOptions<T>): () => T {
  if (!isFunction(computedFn)) {
    throw new Error(`[core] computed: computedFn must be a function, received ${typeof computedFn}`);
  }
  const ce = options?.equals;
  if (ce !== undefined && !isFunction(ce)) {
    throw new Error(`[core] computed: equals must be a function, received ${typeof ce}`);
  }
  const computedState: ComputedState<T> = {
    cbc: undefined,
    rs: undefined,
    rps: undefined,
    rd: undefined,
    rpd: undefined,
    rf: WRITABLE | DIRTY,
    cbf: computedFn,
    ce,
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