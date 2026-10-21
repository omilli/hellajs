import type { SignalNode } from "../signal";
import type { ComputedNode } from "../computed";
import { MUTABLE, DIRTY, RECURSED_CHECK } from "./flags";
import { setCurrentSub } from "./context";
import { purgeDeps } from "./tracking";
import { isEqual } from "./utils";

/**
 * @internal Commits a signal's pending write: moves `pendingValue` into
 * `currentValue` and reports whether the committed value actually changed.
 * @param signalNode The signal to commit.
 * @returns True if the value changed (callers propagate).
 */
export function updateSignal(signalNode: SignalNode): boolean {
  signalNode.flags = MUTABLE; // Reset to a clean value source
  const previousValue = signalNode.currentValue;
  signalNode.currentValue = signalNode.pendingValue;
  // Default equality: reference equality with NaN self-equal, so a repeated NaN
  // write never counts as a change
  return !isEqual(previousValue, signalNode.pendingValue);
}

/**
 * @internal Runs a computed's getter and commits its cached value.
 * @template T
 * @param computedNode The computed to re-evaluate.
 * @returns True if the computed value changed.
 */
export function updateComputed<T = unknown>(computedNode: ComputedNode<T>): boolean {
  const previousSub = setCurrentSub(computedNode);
  computedNode.depsTail = undefined; // Reset the tracking bookmark for a fresh pass
  computedNode.flags = MUTABLE | RECURSED_CHECK;

  try {
    const previousValue = computedNode.value;
    const newValue = computedNode.getter(previousValue);
    // Equality override: an equal result keeps the old reference and reports no change.
    // Skipped on the first evaluation (previous undefined) — comparators assume real
    // values, and the default check below already treats that case identically.
    if (
      computedNode.ce &&
      previousValue !== undefined &&
      computedNode.ce(previousValue, newValue)
    ) {
      return false;
    }
    computedNode.value = newValue;
    return !isEqual(previousValue, newValue);
  } catch (error) {
    // The flag rebuild above dropped DIRTY — without re-marking it, later reads skip
    // re-execution and serve the stale cache (undefined after a first-read throw)
    computedNode.flags = MUTABLE | DIRTY;
    throw error;
  } finally {
    setCurrentSub(previousSub);
    computedNode.flags &= ~RECURSED_CHECK;
    purgeDeps(computedNode);
  }
}
