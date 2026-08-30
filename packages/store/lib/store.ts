import type { Store, StoreOptions, StoreMiddleware } from "./types";
import { createStore } from "./internal/create";

/**
 * Creates a reactive store with specific readonly properties.
 * @template T
 * @template R
 * @param initial Initial object to transform into a reactive store
 * @param options Object with readonly array of property keys to make readonly
 * @throws {Error} When initial contains a reserved key (snapshot, update, cleanup, or subscribe) and is not itself a store.
 */
export function store<T extends Record<string, unknown>, R extends readonly (keyof T)[]>(
  initial: T,
  options: { readonly: R }
): Store<T, R[number]>;

/**
 * Creates a reactive store with all properties readonly.
 * @template T
 * @param initial Initial object to transform into a reactive store
 * @param options Object with readonly: true to make all properties readonly
 * @throws {Error} When initial contains a reserved key (snapshot, update, cleanup, or subscribe) and is not itself a store.
 */
export function store<T extends Record<string, unknown>>(
  initial: T,
  options: { readonly: true }
): Store<T, keyof T>;

/**
 * Creates a reactive store with middleware for value transformation.
 * @template T
 * @param initial Initial object to transform into a reactive store
 * @param options Object with middleware functions for property transformations
 * @throws {Error} When initial contains a reserved key (snapshot, update, cleanup, or subscribe) and is not itself a store.
 */
export function store<T extends Record<string, unknown>>(
  initial: T,
  options: { middleware: StoreMiddleware<T> }
): Store<T, never>;

/**
 * Creates a reactive store with both readonly properties and middleware.
 * @template T
 * @template R
 * @param initial Initial object to transform into a reactive store
 * @param options Object with readonly array and middleware functions
 * @throws {Error} When initial contains a reserved key (snapshot, update, cleanup, or subscribe) and is not itself a store.
 */
export function store<T extends Record<string, unknown>, R extends readonly (keyof T)[]>(
  initial: T,
  options: { readonly: R; middleware: StoreMiddleware<T> }
): Store<T, R[number]>;

/**
 * Creates a reactive store with all properties writable.
 * @template T
 * @param initial Initial object to transform into a reactive store
 * @param options Optional configuration object
 * @throws {Error} When initial contains a reserved key (snapshot, update, cleanup, or subscribe) and is not itself a store.
 */
export function store<T extends Record<string, unknown>>(
  initial: T,
  options?: { readonly?: false | undefined }
): Store<T, never>;

export function store<T extends Record<string, unknown>>(
  initial: T,
  options?: StoreOptions<T>
): Store<T, never> {
  return createStore(initial, options);
}
