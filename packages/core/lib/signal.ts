import { currentValue } from "./internal/context";
import { executeSignal } from "./internal/execution";
import { propagate, propagateChange } from "./internal/propagation";
import { flush } from "./internal/scheduler";
import { createLink } from "./internal/links";
import { isFunction, isEqual } from "./internal/utils";
import { WRITABLE, DIRTY } from "./internal/flags";
import type { Signal, EqualsOptions } from "./types";
import type { Reactive } from "./internal/links";
import { batchDepth } from "./batch";

/**
 * Base interface for a signal.
 * @internal
 * @template T
 */
export interface SignalState<T = unknown> extends Reactive {
  /** The last confirmed value. */
  sbv: T;
  /** The current (potentially uncommitted) value. */
  sbc: T;
}

// Note: the equality comparator is closure-captured by the returned signal function, not
// stored on SignalState — nothing outside this module reads it, and a dead per-node field
// costs every signal a hidden-class property. ComputedState.ce differs: executeComputed
// lives in internal/execution.ts and must read the comparator from the state object.

/**
 * Creates a reactive signal without an initial value. Its value is `undefined` until first set.
 * @template T
 * @returns A signal function that can be used to get or set the value.
 */
export function signal<T>(): Signal<T | undefined>;
/**
 * Creates a reactive signal with an initial value.
 * @template T
 * @param initialValue The initial value of the signal.
 * @returns A signal function that can be used to get or set the value.
 */
export function signal<T>(initialValue: T): Signal<T>;
/**
 * Creates a reactive signal with an initial value and an equality override.
 * When `equals` returns `true`, the write is skipped entirely: the value, the old reference, and all subscriptions stay untouched.
 * @template T
 * @param initialValue The initial value of the signal.
 * @param options Options with an optional `equals` comparator replacing the default equality check (`===`, with `NaN` equal to itself).
 * @returns A signal function that can be used to get or set the value.
 * @throws {Error} When `options.equals` is present and not a function.
 */
export function signal<T>(initialValue: T, options: EqualsOptions<T>): Signal<T>;
export function signal<T>(initialValue?: T, options?: EqualsOptions<T>) {
  const se = options?.equals;
  if (se !== undefined && !isFunction(se)) {
    throw new Error(`[core] signal: equals must be a function, received ${typeof se}`);
  }
  const signalState: SignalState<T> = {
    sbv: initialValue as T,
    sbc: initialValue as T,
    rs: undefined,
    rps: undefined,
    rd: undefined,
    rpd: undefined,
    rf: WRITABLE,
  };

  return function (value?: T) {
    const { sbc, rs, rf } = signalState;
    // Setter path: update value and propagate changes.
    // Equality gate: custom comparator (closure `se`) or the default (`isEqual` — reference equality, NaN self-equal); equal values skip the whole write block.
    if (arguments.length > 0) {
      if (se ? !se(sbc, value as T) : !isEqual(sbc, value)) {
        signalState.sbc = value as T;
        signalState.rf = WRITABLE | DIRTY; // Mark as writable and dirty
        if (rs) {
          propagateChange(rs); // Notify all subscribers
          !batchDepth && flush(); // Process effects immediately unless batching
        }
      }
      return;
    }
    // Getter path: commit dirty value, then upgrade PENDING subscribers to DIRTY
    rf & DIRTY && executeSignal(signalState, sbc) && rs && propagate(rs);
    // Track dependency if we're inside a reactive context
    currentValue && createLink(signalState, currentValue);

    return signalState.sbv;
  };
}
