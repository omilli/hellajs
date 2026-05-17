import type { Store, StoreOptions, StoreMiddleware } from "./types";
import { createStore } from "./create";

/**
 * Creates a reactive store with specific readonly properties.
 * @template T
 * @template R
 * @param initial - Initial object to transform into a reactive store
 * @param options - Object with readonly array of property keys to make readonly
 */
export function store<T extends Record<string, unknown>, R extends readonly (keyof T)[]>(
  initial: T,
  options: { readonly: R }
): Store<T, R[number]>;

/**
 * Creates a reactive store with all properties readonly.
 * @template T
 * @param initial - Initial object to transform into a reactive store
 * @param options - Object with readonly: true to make all properties readonly
 */
export function store<T extends Record<string, unknown>>(
  initial: T,
  options: { readonly: true }
): Store<T, keyof T>;

/**
 * Creates a reactive store with middleware for value transformation.
 * @template T
 * @param initial - Initial object to transform into a reactive store
 * @param options - Object with middleware functions for property transformations
 */
export function store<T extends Record<string, unknown>>(
  initial: T,
  options: { middleware: StoreMiddleware<T> }
): Store<T, never>;

/**
 * Creates a reactive store with all properties writable.
 * @template T
 * @param initial - Initial object to transform into a reactive store
 * @param options - Optional configuration object
 */
export function store<T extends Record<string, unknown>>(
  initial: T,
  options?: { readonly?: false | undefined }
): Store<T, never>;

/**
 * Transforms a plain object into a deeply reactive store.
 *
 * Primitives become signals, nested objects recursively become stores,
 * arrays become signals, and functions are preserved as-is.
 *
 * @template T
 * @param initial - Initial object to transform
 * @param options - Store configuration options
 * @returns Reactive store with snapshot, update, and cleanup methods
 */
export function store<T extends Record<string, unknown>>(
  initial: T,
  options?: StoreOptions<T>
): Store<T, never> {
  return createStore(initial, options);
}
