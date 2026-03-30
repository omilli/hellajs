import type { Signal } from "@hellajs/core";

/**
 * Recursively makes all nested properties optional for partial updates.
 */
export type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> : T[K];
};

/**
 * Middleware functions for transforming values before they're set.
 * Can be nested to apply middleware to specific nested properties.
 */
export type StoreMiddleware<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown>
    ? StoreMiddleware<T[K]> | ((value: T[K]) => T[K])
    : (value: T[K]) => T[K];
};

/**
 * Configuration options for creating a store.
 * @property readonly - true for all properties readonly, or array of property keys
 * @property middleware - Transform functions applied before setting values
 */
export type StoreOptions<T> = {
  readonly?: boolean | readonly (keyof T)[];
  middleware?: StoreMiddleware<T>;
};

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
 * Reactive store type that transforms an object's properties.
 *
 * Property transformations:
 * - Functions: preserved as-is
 * - Arrays: become Signal<Array>
 * - Objects: recursively become nested Store
 * - Primitives: become Signal<T>
 * - Readonly properties: wrapped in getter functions
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
  T[K] extends Record<string, unknown> ?
  T[K] extends unknown[] ? K extends R ? () => T[K] : Signal<T[K]> :
  Store<T[K], R> :
  K extends R ? () => T[K] : Signal<T[K]>;
} & {
  /** Returns a reactive plain object snapshot of the entire store state */
  snapshot: () => T;
  /** Deep merge partial updates or apply mutations via draft function */
  update: (partial: PartialDeep<T> | ((draft: T) => void)) => void;
  /** Recursively dispose all signals and computed values */
  cleanup: () => void;
};
