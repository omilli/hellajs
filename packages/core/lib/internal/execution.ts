import type { SignalState } from "../signal";
import type { ComputedState } from "../computed";
import { WRITABLE } from "./flags";
import { setCurrentSub } from "./context";
import { startTracking, endTracking } from "./tracking";
import { isEqual } from "./utils";

/**
 * @internal Executes a signal update, committing the current value to base and checking for changes.
 * @param signalValue The signal to execute.
 * @param value The new value to commit.
 * @returns True if the value actually changed.
 */
export function executeSignal(signalValue: SignalState, value: unknown): boolean {
  signalValue.rf = WRITABLE; // Reset to writable state
  const oldValue = signalValue.sbv;
  signalValue.sbv = value; // Commit current value to base value
  // Return true only if value actually changed (triggers propagation)
  return !isEqual(oldValue, value);
}

/**
 * @internal Executes a computed signal's computedFn function and updates its cached value.
 * @template T
 * @param computedValue The computed signal to execute.
 * @returns True if the computed value changed.
 */
export function executeComputed<T = unknown>(computedValue: ComputedState<T>): boolean {
  const prevSubValue = setCurrentSub(computedValue);
  const { cbc, cbf, ce } = computedValue;

  startTracking(computedValue);

  try {
    const prevValue = cbc;
    const newValue = cbf(prevValue);
    // Equality override: an equal result keeps the old reference and reports no change.
    // Skipped on the first evaluation (prev undefined) — comparators assume real values,
    // and the default check below already treats that case identically.
    if (ce && prevValue !== undefined && ce(prevValue, newValue)) return false;
    computedValue.cbc = newValue;
    return !isEqual(prevValue, newValue);
  } finally {
    setCurrentSub(prevSubValue);
    endTracking(computedValue);
  }
}

/**
 * @internal Updates the value of a signal or computed signal using polymorphic dispatch.
 * @param value The reactive node to update.
 * @returns True if the value changed.
 */
export function updateValue(value: SignalState | ComputedState): boolean {
  // Polymorphic dispatch: computed has cbf (compute function), signal doesn't
  if ((value as ComputedState).cbf) {
    return executeComputed(value as ComputedState);
  }
  return executeSignal(value as SignalState, (value as SignalState).sbc);
}
