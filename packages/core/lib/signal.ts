import { currentValue, executeSignal, processQueue, propagate, propagateChange } from "./reactive";
import { createLink } from "./links";
import { Flags, type SignalBase } from "./types";
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
    lastVal: initialValue as T,
    currentVal: initialValue as T,
    subs: undefined,
    prevSub: undefined,
    deps: undefined,
    prevDep: undefined,
    flags: Flags.W,
  };

  return function (value?: T) {
    const { currentVal, subs, flags } = signalValue;

    // Setter path: update value and propagate changes
    if (arguments.length > 0) {
      // Only update if value actually changed (assignment returns new value)
      if (currentVal !== (signalValue.currentVal = value!)) {
        signalValue.flags = Flags.W | Flags.D; // Mark as writable and dirty
        if (subs) {
          propagateChange(subs); // Notify all subscribers
          if (!batchDepth) processQueue(); // Process effects immediately unless batching
        }
      }
      return;
    }

    // Getter path: check if dirty and update lastVal if needed
    if (flags & Flags.D && executeSignal(signalValue, currentVal) && subs) {
      propagate(subs); // Propagate to computed signals that depend on this
    }

    // Track dependency if we're inside a reactive context
    if (currentValue) {
      createLink(signalValue, currentValue);
    }

    return currentVal;
  };
}
