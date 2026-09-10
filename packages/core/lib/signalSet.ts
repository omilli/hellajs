import { signal } from "./signal";
import { createHooks, createVersion } from "./internal/collections";
import { isFunction } from "./internal/utils";
import type { Signal, SignalSet, CollectionOptions } from "./types";

/**
 * Creates a granular set signal: one membership signal per value plus a structural
 * version signal. `has` readers wake on `add`/`delete` of their value alone (a
 * present-value `add` is a no-op that wakes nothing); `size`, iteration, and
 * whole-callable readers wake on any membership change. Calling the container with
 * no arguments returns a fresh plain `Set` that tracks everything; calling it with a
 * `Set` reconciles value-wise. Values are stored raw by default; the `wrap`
 * element-lifecycle hook lets a host package convert values entering membership
 * (initial values, `add`, and the reconcile setter). A set has no keyed positions
 * or value writes, so `equals` and `merge` are accepted for options-shape parity
 * with the sibling containers but never fire.
 * @template T
 * @param initial Initial values, each passed through `wrap`.
 * @param options Element-lifecycle `wrap`; `equals`/`merge` are validated but inert for sets.
 * @returns A granular set signal.
 * @throws {Error} When `options.equals`, `options.wrap`, or `options.merge` is present and not a function.
 * @throws {Error} When `initial` is present and not iterable.
 * @throws {Error} When the reconcile setter receives a non-Set value.
 */
export function signalSet<T>(initial?: Iterable<T>, options?: CollectionOptions<T>): SignalSet<T> {
  const hooks = createHooks("signalSet", options);
  if (initial !== undefined && !isFunction(initial?.[Symbol.iterator])) {
    throw new Error(`[core] signalSet: initial must be iterable, received ${typeof initial}`);
  }
  const { read: version, bump } = createVersion();
  const membership = new Map<T, Signal<boolean>>(); // Per-value membership signals; lazily created by has() probes
  const live = new Set<T>(); // Membership truth

  if (initial !== undefined) {
    const values = Array.from(initial);
    let i = 0;
    const len = values.length;
    while (i < len) {
      const wrapped = hooks.wrap(values[i]!);
      membership.set(wrapped, signal(true));
      live.add(wrapped);
      i++;
    }
  }

  const reconcile = (next: Set<T>): void => {
    if (!(next instanceof Set)) {
      throw new Error(`[core] signalSet: value must be a Set, received ${typeof next}`);
    }
    let isStructural = false;
    // Wrap the incoming diff once up front: membership keys on converted values,
    // so the add and delete passes must both compare wrapped, never raw
    const rawValues = Array.from(next);
    const wrappedValues: T[] = [];
    let i = 0;
    const len = rawValues.length;
    while (i < len) {
      wrappedValues.push(hooks.wrap(rawValues[i]!));
      i++;
    }
    const nextSet = new Set(wrappedValues);
    i = 0;
    while (i < len) {
      const value = wrappedValues[i]!;
      if (!live.has(value)) {
        const existing = membership.get(value);
        if (existing) {
          existing(true);
        } else {
          membership.set(value, signal(true));
        }
        live.add(value);
        isStructural = true;
      }
      i++;
    }
    const currentValues = Array.from(live);
    i = 0;
    const currentLen = currentValues.length;
    while (i < currentLen) {
      const value = currentValues[i]!;
      if (!nextSet.has(value)) {
        live.delete(value);
        const existing = membership.get(value);
        existing && existing(false);
        isStructural = true;
      }
      i++;
    }
    isStructural && bump();
  };

  const container = function (next?: Set<T>) {
    if (arguments.length > 0) {
      reconcile(next as Set<T>);
      return;
    }
    version();
    return new Set(live);
  } as SignalSet<T>;

  container.add = (raw: T): SignalSet<T> => {
    const value = hooks.wrap(raw);
    if (live.has(value)) return container; // Equality gate: a present value stays a no-op
    const existing = membership.get(value);
    if (existing) {
      existing(true);
    } else {
      membership.set(value, signal(true));
    }
    live.add(value);
    bump();
    return container;
  };

  container.has = (value: T): boolean => {
    let handle = membership.get(value);
    if (handle === undefined) {
      // Lazily create the membership signal so a later add/delete of this value wakes the reader
      handle = signal(false);
      membership.set(value, handle);
    }
    return handle();
  };

  container.delete = (value: T): boolean => {
    if (!live.has(value)) return false;
    live.delete(value);
    const existing = membership.get(value);
    existing && existing(false); // Wakes has() readers of this value only
    bump();
    return true;
  };

  container.size = (): number => {
    version();
    return live.size;
  };

  container.forEach = (fn: (value: T) => void): void => {
    version();
    live.forEach(fn);
  };

  return container;
}
