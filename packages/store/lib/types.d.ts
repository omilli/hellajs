import type { Signal } from "@hellajs/core";

/**
 * Recursively makes all nested properties optional for partial updates.
 * Arrays and functions are preserved as-is (not recursed into).
 */
export type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends (...args: unknown[]) => unknown
  ? T[K]
  : T[K] extends unknown[]
  ? T[K]
  : T[K] extends Record<string, unknown>
  ? PartialDeep<T[K]>
  : T[K];
};

/**
 * Middleware functions for transforming values before they're set.
 * Can be nested to apply middleware to specific nested properties.
 * Arrays and functions are treated as values (no nested middleware).
 */
export type StoreMiddleware<T> = {
  [K in keyof T]?: T[K] extends (...args: unknown[]) => unknown
  ? (value: T[K]) => T[K]
  : T[K] extends unknown[]
  ? (value: T[K]) => T[K]
  : T[K] extends Record<string, unknown>
  ? StoreMiddleware<T[K]>
  : (value: T[K]) => T[K];
};

/**
 * Per-key write-equality comparators, nested for object values like StoreMiddleware.
 * A comparator returns true to skip the write entirely; "structural" compares by
 * content, reusing the draft path's comparator. Function properties are never
 * settable, so they accept no comparator.
 */
export type StoreEquals<T> = {
  [K in keyof T]?: T[K] extends (...args: unknown[]) => unknown ? never
    : T[K] extends unknown[] ? EqualsFor<T[K]>
    : T[K] extends Record<string, unknown> ? StoreEquals<T[K]>
    : EqualsFor<T[K]>;
};

/**
 * A single leaf's write-equality control: a custom (previous, next) comparator
 * returning true to skip the write, or the "structural" content-equality preset.
 */
type EqualsFor<V> = ((previous: V, next: V) => boolean) | "structural";

/**
 * Configuration options for creating a store.
 */
export interface StoreOptions<T> {
  /** true for all properties readonly, or array of specific property keys to make readonly */
  readonly?: boolean | readonly (keyof T)[];
  /** Transform functions applied before setting values, nested for specific properties */
  middleware?: StoreMiddleware<T>;
  /** Per-key write-equality comparators; equal writes are skipped and wake no subscriber. "structural" compares by content */
  equals?: StoreEquals<T>;
}

/**
 * Extracts which keys are readonly based on StoreOptions.
 */
export type ReadonlyKeys<T, O extends StoreOptions<T> | undefined> =
  O extends { readonly: true }
  ? keyof T
  : O extends { readonly: readonly (keyof T)[] }
  ? O["readonly"][number]
  : never;

/**
 * Recursively unwraps composed store types so Snapshot matches the plain
 * values snapshot() actually returns: nested Store members resolve to their
 * data types, everything else is preserved.
 */
export type Snapshot<T> = {
  [K in keyof T]:
  T[K] extends Store<infer U, PropertyKey> ? Snapshot<U> :
  T[K];
};

/**
 * Keys of T whose store properties are signal-backed (settable). Function-valued
 * keys (preserved as-is, including composed stores) and plain-object keys (nested
 * stores) never become signals, so they are excluded. Class instances lack a string
 * index signature and stay settable — they become signals like primitives.
 */
type SettableKeyOf<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? never
  : T[K] extends Record<string, unknown> ? never
  : K;
}[keyof T];

/**
 * Reactive store type that transforms an object's properties.
 *
 * Property transformations:
 * - Functions: preserved as-is
 * - Arrays: become Signal<Array>
 * - Objects: recursively become nested Store; readonly object keys propagate deep (`Store<T[K], keyof T[K]>`)
 * - Primitives: become Signal<T>
 * - Readonly properties: wrapped in getter functions that throw on write attempts
 * - Composed stores keep their own config — adoption preserves their signals as-is
 *
 * Built-in methods:
 * - snapshot(): Returns plain object representation of current state
 * - update(partial): Deep merge partial updates into store
 * - cleanup(): Dispose all reactive subscriptions
 * - subscribe(key, callback): Observe changes to a single settable property
 */
export type Store<
  T extends Record<string, unknown> = Record<string, never>,
  R extends PropertyKey = never
> = {
  [K in keyof T]:
  T[K] extends (...args: unknown[]) => unknown ? T[K] :
  T[K] extends unknown[] ? K extends R ? () => T[K] : Signal<T[K]> :
  T[K] extends Record<string, unknown> ? (K extends R ? Store<T[K], keyof T[K]> : Store<T[K]>) :
  K extends R ? () => T[K] : Signal<T[K]>;
} & {
  /** Returns a reactive plain-object snapshot of the entire store state; composed nested stores unwrap to their plain data types */
  snapshot: () => Snapshot<T>;
  /**
   * Deep merge partial updates or apply mutations via draft function.
   * @throws {Error} When `partial` touches an unknown key, a reserved key, a function property, a store key with a non-object value, or a readonly key.
   */
  update: (partial: PartialDeep<T> | ((draft: Snapshot<T>) => void)) => void;
  /** Recursively invokes cleanup on nested stores; individual signals are not disposed — they remain functional */
  cleanup: () => void;
  /**
   * Subscribes to changes of a single signal-backed (settable) property.
   * @param key Name of a settable property — nested-store keys, preserved functions, reserved keys, and unknown keys throw
   * @param callback Receives the next and previous values; runs untracked, so signal reads inside it never widen the subscription. Not called for the initial value
   * @returns Unsubscribe function; safe to call more than once
   * @throws {Error} When key is not a settable key of the store.
   */
  subscribe: <K extends SettableKeyOf<T>>(key: K, callback: (next: T[K], prev: T[K]) => void) => () => void;
};
