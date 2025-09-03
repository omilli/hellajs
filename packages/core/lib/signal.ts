import { currentValue, executeSignal, processQueue, propagate, propagateChange } from "./reactive";
import { createLink } from "./links";
import { F, type SignalBase } from "./types";
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
  const signalValue: SignalBase<T> = {
    sbv: initialValue as T,
    sbc: initialValue as T,
    rs: undefined,
    rps: undefined,
    rd: undefined,
    rpd: undefined,
    rf: F.W,
  };

  return function (value?: T) {
    const { sbc, rs, rf } = signalValue;

    // Setter path: update value and propagate changes
    if (arguments.length > 0) {
      // Only update if value actually changed (assignment returns new value)
      if (sbc !== (signalValue.sbc = value!)) {
        signalValue.rf = F.W | F.D; // Mark as writable and dirty
        if (rs) {
          propagateChange(rs); // Notify all subscribers
          !batchDepth && processQueue(); // Process effects immediately unless batching
        }
      }
      return;
    }

    // Getter path: check if dirty and update sbv if needed
    // Propagate to computed signals that depend on this
    rf & F.D && executeSignal(signalValue, sbc) && rs && propagate(rs);

    // Track dependency if we're inside a reactive context
    currentValue && createLink(signalValue, currentValue);

    return sbc;
  };
}
