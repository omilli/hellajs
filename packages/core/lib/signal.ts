import { currentValue } from "./internal/context";
import { executeSignal } from "./internal/execution";
import { propagate, propagateChange } from "./internal/propagation";
import { flush } from "./internal/scheduler";
import { createLink } from "./internal/links";
import { WRITABLE, DIRTY } from "./internal/flags";
import type { Signal, SignalState } from "./types";
import { batchDepth } from "./batch";

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
export function signal<T>(initialValue?: T) {
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
    // Setter path: update value and propagate changes
    if (arguments.length > 0) {
      // Only update if value actually changed (reference equality)
      if (sbc !== value) {
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
