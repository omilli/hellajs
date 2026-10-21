import { currentValue } from "./internal/context";
import { updateSignal } from "./internal/execution";
import { flush } from "./internal/scheduler";
import { link, propagate, shallowPropagate } from "./internal/system";
import { isFunction, isEqual } from "./internal/utils";
import { MUTABLE, DIRTY } from "./internal/flags";
import type { ReactiveNode } from "./internal/system";
import type { Signal, EqualsOptions } from "./types";
import { batchDepth } from "./batch";

/**
 * Reactive signal node: a value source with a committed value and a pending
 * write. The setter stages `pendingValue`; the getter (or a flush-time
 * validation) commits it via `updateSignal`.
 * @internal
 * @template T
 */
export interface SignalNode<T = unknown> extends ReactiveNode {
  /** The last committed value. */
  currentValue: T;
  /** The staged, not-yet-committed value. */
  pendingValue: T;
}

// Note: the equality comparator is closure-captured by the returned signal function, not
// stored on SignalNode — nothing outside this module reads it, and a dead per-node field
// costs every signal a hidden-class property. ComputedNode.ce differs: updateComputed
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
  const signalNode: SignalNode<T> = {
    currentValue: initialValue as T,
    pendingValue: initialValue as T,
    deps: undefined,
    depsTail: undefined,
    subs: undefined,
    subsTail: undefined,
    flags: MUTABLE,
  };

  return function (value?: T) {
    // Setter path: stage the value and propagate changes.
    // Equality gate: custom comparator (closure `se`) or the default (`isEqual` — reference
    // equality, NaN self-equal); equal values skip the whole write block.
    if (arguments.length > 0) {
      const previousValue = signalNode.pendingValue;
      if (se ? !se(previousValue, value as T) : !isEqual(previousValue, value)) {
        signalNode.pendingValue = value as T;
        signalNode.flags = MUTABLE | DIRTY;
        const subs = signalNode.subs;
        if (subs !== undefined) {
          propagate(subs, false); // Notify all subscribers
          !batchDepth && flush(); // Process effects immediately unless batching
        }
      }
      return;
    }
    // Getter path: commit a staged write, then dirt-mark subscribers of the changed signal
    const { flags: rf, subs } = signalNode;
    rf & DIRTY && updateSignal(signalNode) && subs !== undefined && shallowPropagate(subs);
    // Track dependency if we're inside a reactive context
    currentValue && link(signalNode, currentValue, 0);

    return signalNode.currentValue;
  };
}
