import { currentValue, executeSignal, propagate, propagateChange, flush, createLink, WRITABLE, DIRTY } from "./internal";
import { type SignalState } from "./types";
import { deepEqual } from "./utils";
import { batchDepth } from "./batch";

/**
 * Creates a reactive signal that can hold any value.
 * When created without an argument, its value is `undefined`.
 * @template T
 * @param initialValue The initial value of the signal.
 * @returns A signal function that can be used to get or set the value.
 */
export function signal<T>(): {
  (): T | undefined;
  (value: T | undefined): void;
};
export function signal<T>(initialValue: T): {
  (): T;
  (value: T): void;
};
export function signal<T>(initialValue?: T) {
  const signalState: SignalState<T> = {
    sbv: initialValue as T,
    sbc: initialValue as T,
    rf: WRITABLE,
  };

  return function (value?: T) {
    const { sbc, rs, rf } = signalState;
    // Setter path: update value and propagate changes
    if (arguments.length > 0) {
      // Only update if value actually changed (deep equality check)
      if (!deepEqual(sbc, value)) {
        signalState.sbc = value!;
        signalState.rf = WRITABLE | DIRTY; // Mark as writable and dirty
        if (rs) {
          propagateChange(rs); // Notify all subscribers
          !batchDepth && flush(); // Process effects immediately unless batching
        }
      }
      return;
    }
    // Getter path: check if dirty and update sbv if needed
    // Propagate to computed signals that depend on this
    rf & DIRTY && executeSignal(signalState, sbc) && rs && propagate(rs);
    // Track dependency if we're inside a reactive context
    currentValue && createLink(signalState, currentValue);

    return signalState.sbv;
  };
}
