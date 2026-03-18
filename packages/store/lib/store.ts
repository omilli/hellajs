import type { Store, StoreOptions, StoreMiddleware } from "./types";
import { createStore } from "./create";

/**
 * Creates a reactive store with specific readonly properties.
 */
export function store<T extends Record<string, unknown>, R extends readonly (keyof T)[]>(
  initial: T,
  options: { readonly: R }
): Store<T, R[number]>;

/**
 * Creates a reactive store with all properties readonly.
 */
export function store<T extends Record<string, unknown>>(
  initial: T,
  options: { readonly: true }
): Store<T, keyof T>;

/**
 * Creates a reactive store with middleware.
 */
export function store<T extends Record<string, unknown>>(
  initial: T,
  options: { middleware: StoreMiddleware<T> }
): Store<T, never>;

/**
 * Creates a reactive store with all properties writable.
 */
export function store<T extends Record<string, unknown>>(
  initial: T,
  options?: { readonly?: false | undefined }
): Store<T, never>;

/**
 * Creates a reactive store from an initial object.
 */
export function store<T extends Record<string, unknown>>(
  initial: T,
  options?: StoreOptions<T>
): Store<T, never> {
  return createStore(initial, options);
}
