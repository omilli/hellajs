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

/**
 * Storage backend for `persistStore`. Async-first: every method may return a
 * promise, so IndexedDB-backed adaptors implement the same interface as
 * synchronous localStorage ones.
 */
export interface StoreAdaptor {
  /** Reads the persisted raw value, or null when nothing was ever persisted */
  read(): string | null | Promise<string | null>;
  /** Persists the serialized projection of the store */
  write(value: string): void | Promise<void>;
  /** Removes the persisted value — called when stored state is corrupt or no longer matches the store shape */
  clear(): void | Promise<void>;
}

/**
 * Configuration options for persisting a store.
 */
export interface PersistOptions<T extends Record<string, unknown>> {
  /** Serializes the partialized state; default `JSON.stringify` */
  serialize?: (state: PartialDeep<T>) => string;
  /** Parses stored raw into an update()-shaped partial; default `JSON.parse` */
  deserialize?: (raw: string) => PartialDeep<T>;
  /** Projects the snapshot down to the persistable subset; default identity. Persist only serializable keys — class instances silently corrupt through a JSON round-trip */
  partialize?: (state: Snapshot<T>) => PartialDeep<T>;
  /** Coalesces write-through bursts into one write per window (milliseconds) */
  debounce?: number;
  /** Fires when stored state is corrupt or shape-drifted (storage is then cleared) and on adaptor read/write/clear failure (storage untouched) */
  onError?: (error: unknown) => void;
}

/**
 * Handle returned by `persistStore`.
 */
export interface PersistHandle {
  /** Signal-backed reactive flag — true once the read settles (state applied, storage empty, or fallback). Reads inside an effect re-run on the flip */
  readonly hydrated: () => boolean;
  /** Resolves when hydration settles; never rejects — `onError` is the error channel. Abandoned if `dispose` runs first */
  readonly ready: Promise<void>;
  /** Stops write-through and the persistence effect, cancels a pending debounced write, removes the pagehide flush; idempotent */
  dispose(): void;
}
