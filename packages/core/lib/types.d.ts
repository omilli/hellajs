/**
 * A function that acts as both a getter and a setter for a signal's value.
 * @template T
 */
export type Signal<T> = {
  /** Gets the current value. */
  (): T;
  /** Sets a new value. */
  (value: T): void;
};

/**
 * Options bag for reactive primitives with an equality override.
 * @template T
 */
export interface EqualsOptions<T> {
  /**
   * Custom equality comparator. Returning `true` treats the values as equal:
   * the write is skipped entirely and the old reference is kept.
   */
  equals?: (oldValue: T, newValue: T) => boolean;
}

/**
 * Options bag for collection signals. `equals` applies per element (each child
 * signal receives it); `wrap` and `merge` are element-lifecycle hooks that let a
 * host package layer deep semantics on top without core knowing about it.
 * @template T
 */
export interface CollectionOptions<T> extends EqualsOptions<T> {
  /**
   * Transforms every value entering a node: initial elements, inserts, and writes
   * that survive the merge stage. Runs after `merge` declines the write.
   */
  wrap?: (element: T) => T;
  /**
   * Attempts an in-place update of the existing element; returning `true` marks the
   * write handled (no child write, no version bump). Receives the stored element and
   * the raw incoming value, before `wrap` applies.
   */
  merge?: (prev: T, next: T) => boolean;
}

/**
 * A granular array signal: one child signal per element plus a structural version.
 * Calling it with no arguments reads a fresh plain snapshot that tracks everything;
 * calling it with an array reconciles position-wise. `W` is the write-side element
 * type (write and insert methods accept it); it defaults to `T` — a host package
 * converting elements on entry sets `W` to the raw form while reads return the
 * converted `T`.
 * @template T Read-side (stored) element type.
 * @template W Write-side element type accepted by writes and inserts; defaults to `T`.
 */
export interface SignalArray<T, W = T> {
  /** Reads a fresh plain array snapshot; tracks the version and every element. */
  (): T[];
  /** Reconciles position-wise through the merge/wrap/equals pipeline. */
  (value: W[]): void;
  /** Reads the element at `i` (tracks the version and that element's node); out-of-bounds reads return `undefined`. */
  get(i: number): T | undefined;
  /** Writes the element at `i` through the merge/wrap/equals pipeline. An index past the end extends the array (gaps hold `undefined`); a negative index never addresses an element. */
  set(i: number, value: W): void;
  /** Appends elements (each passed through `wrap`) and wakes positional readers. Returns the new length. */
  push(...values: W[]): number;
  /** Removes the last element and wakes positional readers. Returns its value, or `undefined` when empty. */
  pop(): T | undefined;
  /** Native-semantics splice over element nodes. Returns the removed values in a plain array. */
  splice(start: number, deleteCount?: number, ...insert: W[]): T[];
  /** Inserts elements at `i` (clamped like native splice) and wakes positional readers. */
  insert(i: number, ...values: W[]): void;
  /** Returns the current length; tracks the version only. */
  length(): number;
  /** Maps over element values, tracking the version and every element read during iteration. */
  map<U>(fn: (value: T, index: number) => U): U[];
  /** Iterates element values, tracking the version and every element read during iteration. */
  forEach(fn: (value: T, index: number) => void): void;
  /** Returns the stable node signal for the element at `i` (reading it never wakes on moves), or `undefined` when out of bounds. */
  nodeAt(i: number): Signal<T> | undefined;
}

/**
 * A granular map signal: one value signal per key plus a structural version.
 * Calling it with no arguments reads a fresh plain `Map` that tracks everything;
 * calling it with a `Map` reconciles key-wise. `W` is the write-side value type
 * (`set` and the reconcile setter accept it); it defaults to `V` — a host package
 * converting values on entry sets `W` to the raw form while reads return the
 * converted `V`. `entry(k)` returns a stable handle whose readers wake only on
 * that key's value or membership changes.
 * @template K Key type.
 * @template V Read-side (stored) value type.
 * @template W Write-side value type accepted by writes; defaults to `V`.
 */
export interface SignalMap<K, V, W = V> {
  /** Reads a fresh plain `Map` snapshot; tracks the version and every value. */
  (): Map<K, V>;
  /** Reconciles key-wise through the merge/wrap/equals pipeline. */
  (value: Map<K, W>): void;
  /** Reads the value at `k` (tracks the version and that key's signal); absent keys return `undefined`. */
  get(k: K): V | undefined;
  /** Writes the value at `k` through the merge/wrap/equals pipeline; a new key is a structural change. */
  set(k: K, value: W): void;
  /** Returns whether `k` is present; tracks the version only (value writes never wake `has` readers). */
  has(k: K): boolean;
  /** Removes `k` (a structural change; zero child writes). Returns whether the key was present. */
  delete(k: K): boolean;
  /** Returns the current entry count; tracks the version only. */
  size(): number;
  /** Iterates `(value, key)` pairs, tracking the version and every value read during iteration. */
  forEach(fn: (value: V, key: K) => void): void;
  /** Returns the live keys in a plain array; tracks the version only. */
  keys(): K[];
  /** Returns the live values in a plain array, tracking the version and every value read during iteration. */
  values(): V[];
  /** Returns a stable handle reading the current value of `k` (`undefined` when absent); wakes only on that key's value or membership changes. */
  entry(k: K): Signal<V | undefined>;
}

/**
 * A granular set signal: one membership signal per value plus a structural version.
 * Calling it with no arguments reads a fresh plain `Set` that tracks everything;
 * calling it with a `Set` reconciles value-wise. `W` is the write-side value type
 * (`add` and the reconcile setter accept it); it defaults to `T` — a host package
 * converting values on entry sets `W` to the raw form while membership and reads
 * key on the converted `T`. `has` and `delete` accept either form, so identity
 * probes against the raw input stay legal.
 * @template T Read-side (stored) value type.
 * @template W Write-side value type accepted by `add` and the reconcile setter; defaults to `T`.
 */
export interface SignalSet<T, W = T> {
  /** Reads a fresh plain `Set` snapshot; tracks the version. */
  (): Set<T>;
  /** Reconciles value-wise: missing values are added, values absent from the input are removed. */
  (value: Set<W>): void;
  /** Adds a value (a structural change when absent). Adding a present value is a no-op. Returns the container. */
  add(value: W): this;
  /** Returns whether the value is present; tracks that value's membership signal only, so readers wake on `add`/`delete` of that value alone. */
  has(value: T | W): boolean;
  /** Removes the value (a structural change when present). Returns whether the value was present. */
  delete(value: T | W): boolean;
  /** Returns the current element count; tracks the version only. */
  size(): number;
  /** Iterates values, tracking the version. */
  forEach(fn: (value: T) => void): void;
}
