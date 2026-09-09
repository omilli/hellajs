import { signal } from "../signal";
import { untracked } from "../untracked";
import { isFunction } from "./utils";
import type { Signal, CollectionOptions } from "../types";

/**
 * Normalized element-lifecycle hooks for a collection signal.
 * @internal
 * @template T
 */
export interface CollectionHooks<T> {
  /** Per-element equality comparator handed to each child signal. */
  ce?: (oldValue: T, newValue: T) => boolean;
  /** Transforms every value entering a node; identity when no `wrap` option. */
  wrap: (element: T) => T;
  /** Optional in-place update attempt ahead of the wrap/write path. */
  merge?: (prev: T, next: T) => boolean;
}

/**
 * A structural version signal with its bump function: structural collection ops
 * increment it (never re-equal) to wake version-tracking readers; value ops never
 * touch it.
 * @internal
 * @returns `read` tracks structure inside reactive contexts; `bump` marks one structural change.
 */
export function createVersion(): { read: Signal<number>; bump: () => void } {
  const version = signal(0);
  let count = 0;
  return { read: version, bump: () => version(++count) };
}

/**
 * Validates `CollectionOptions` members and normalizes them into hooks: `wrap`
 * defaults to identity, `merge` stays optional.
 * @internal
 * @template T
 * @param name Calling export name, for error messages.
 * @param options The user options bag.
 * @returns The normalized hooks.
 * @throws {Error} When `equals`, `wrap`, or `merge` is present and not a function.
 */
export function createHooks<T>(
  name: string,
  options?: CollectionOptions<T>
): CollectionHooks<T> {
  const ce = options?.equals;
  const wrap = options?.wrap;
  const merge = options?.merge;
  if (ce !== undefined && !isFunction(ce)) {
    throw new Error(`[core] ${name}: equals must be a function, received ${typeof ce}`);
  }
  if (wrap !== undefined && !isFunction(wrap)) {
    throw new Error(`[core] ${name}: wrap must be a function, received ${typeof wrap}`);
  }
  if (merge !== undefined && !isFunction(merge)) {
    throw new Error(`[core] ${name}: merge must be a function, received ${typeof merge}`);
  }
  return { ce, wrap: wrap ?? ((element: T) => element), merge };
}

/**
 * Reads a signal's current value without establishing a dependency; write paths
 * must not track the values they compare and return.
 * @internal
 * @template T
 * @param s The signal to read.
 * @returns The current value.
 */
export function peekSignal<T>(s: Signal<T>): T {
  return untracked(() => s());
}

/**
 * Write pipeline for an existing element target: `merge` first (returning `true`
 * marks the write handled: no child write, no version bump), then `wrap`, then the
 * child write whose per-element `equals` gate decides propagation. Merge-before-wrap
 * ordering is load-bearing: `merge` must see the raw incoming value against the
 * stored one, so wrapping first would defeat host packages matching raw input
 * against converted nodes.
 * @internal
 * @template T
 * @param s The element's child signal.
 * @param next The raw incoming value.
 * @param hooks The container's normalized hooks.
 */
export function writeValue<T>(s: Signal<T>, next: T, hooks: CollectionHooks<T>): void {
  if (hooks.merge && hooks.merge(peekSignal(s), next)) return;
  s(hooks.wrap(next));
}
