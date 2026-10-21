import { currentValue } from "./internal/context";
import { updateComputed } from "./internal/execution";
import { link, checkDirty, shallowPropagate } from "./internal/system";
import { NONE, DIRTY, PENDING, SIGNAL_DEPS } from "./internal/flags";
import { isFunction } from "./internal/utils";
import type { ReactiveNode } from "./internal/system";
import type { EqualsOptions } from "./types";

/**
 * Computed node: a lazily re-evaluated transform with a cached value. Starting
 * from `NONE` routes the first read through the fresh-evaluation arm of the
 * getter, which also re-marks DIRTY when that first evaluation throws.
 * @internal
 * @template T
 */
export interface ComputedNode<T = unknown> extends ReactiveNode {
  /** The cached value of the computation. */
  value: T | undefined;
  /** The function that computes the value; receives the previous value on re-computation. */
  getter: (previousValue?: T) => T;
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
export function computed<T>(
  computedFn: (previousValue?: T) => T,
  options: EqualsOptions<T>,
): () => T;
export function computed<T>(
  computedFn: (previousValue?: T) => T,
  options?: EqualsOptions<T>,
): () => T {
  if (!isFunction(computedFn)) {
    throw new Error(
      `[core] computed: computedFn must be a function, received ${typeof computedFn}`,
    );
  }
  const ce = options?.equals;
  if (ce !== undefined && !isFunction(ce)) {
    throw new Error(`[core] computed: equals must be a function, received ${typeof ce}`);
  }
  const computedNode: ComputedNode<T> = {
    value: undefined,
    deps: undefined,
    depsTail: undefined,
    subs: undefined,
    subsTail: undefined,
    flags: NONE,
    getter: computedFn,
    ce,
  };

  return () => {
    const { flags: rf, deps, subs } = computedNode;
    // Re-evaluate if dirty or pending with stale dependencies. The PENDING clear is folded
    // into the condition: when validation confirms staleness, updateComputed rebuilds the
    // flag word (PENDING already gone); when it does not, the comma arm clears it from the
    // snapshot — which never carries DIRTY here (the first arm short-circuits), so a
    // fresh-clean flag word is never clobbered back to stale
    (rf & DIRTY ||
      (rf & PENDING &&
        (checkDirty(deps!, computedNode) || ((computedNode.flags = rf & ~PENDING), false)))) &&
      updateComputed(computedNode) &&
      subs !== undefined &&
      shallowPropagate(subs);
    if (!rf) {
      // Fresh evaluation — routed through updateComputed so a throwing first run
      // re-marks DIRTY and rethrows on every later read (never a stale cache)
      updateComputed(computedNode);
    }
    // Track this computed as a dependency if we're inside a reactive context
    const sub = currentValue;
    if (sub !== undefined) {
      link(computedNode, sub, 0);
      // A computed dependency forces flush-time validation (its value may come out
      // equal) — drop the subscriber's signals-only fast path. One-time: never re-armed
      sub.flags &= ~SIGNAL_DEPS;
    }

    return computedNode.value!;
  };
}
