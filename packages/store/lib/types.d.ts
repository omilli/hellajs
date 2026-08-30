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
 * Configuration options for creating a store.
 */
export interface StoreOptions<T> {
  /** true for all properties readonly, or array of specific property keys to make readonly */
  readonly?: boolean | readonly (keyof T)[];
  /** Transform functions applied before setting values, nested for specific properties */
  middleware?: StoreMiddleware<T>;
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
 * Reactive store type that transforms an object's properties.
 *
 * Property transformations:
 * - Functions: preserved as-is
 * - Arrays: become Signal<Array>
 * - Objects: recursively become nested Store; readonly object keys propagate deep (`Store<T[K], keyof T[K]>`)
 * - Primitives: become Signal<T>
 * - Readonly properties: wrapped in getter functions
 * - Composed stores keep their own config — adoption preserves their signals as-is
 *
 * Built-in methods:
 * - snapshot(): Returns plain object representation of current state
 * - update(partial): Deep merge partial updates into store
 * - cleanup(): Dispose all reactive subscriptions
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
  /** Deep merge partial updates or apply mutations via draft function */
  update: (partial: PartialDeep<T> | ((draft: Snapshot<T>) => void)) => void;
  /** Recursively invokes cleanup on nested stores; individual signals are not disposed — they remain functional */
  cleanup: () => void;
};
