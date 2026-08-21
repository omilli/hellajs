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
