import { isFunction } from "@hellajs/core";
import type { Signal } from "@hellajs/core";

/** Property names reserved by the store implementation */
export const reservedKeys = new Set(["snapshot", "update", "cleanup"]);

/**
 * Checks if value is a non-null object.
 * @param value The value to check.
 * @returns True if value is a non-null object.
 */
export const isObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

/**
 * Detects store-shaped values: objects with snapshot/update/cleanup methods.
 * Used to allow store composition without triggering reserved key collision.
 * @param value The value to check.
 * @returns True if value looks like a store.
 */
export const isStore = (value: unknown): boolean =>
  isObject(value)
  && "snapshot" in value
  && "update" in value
  && "cleanup" in value
  && isFunction((value as { snapshot: unknown }).snapshot)
  && isFunction((value as { update: unknown }).update)
  && isFunction((value as { cleanup: unknown }).cleanup);

/**
 * Checks if value is object or function (for cleanup traversal).
 * @param value The value to check.
 * @returns True if value is a non-null object or a function.
 */
export const isObjectOrFunction = (value: unknown): boolean =>
  isObject(value) || isFunction(value);

/**
 * Applies an update to a target signal, optionally through middleware.
 * @internal
 */
export const applyUpdate = (
  target: unknown,
  value: unknown,
  middlewares: Record<string, unknown> | undefined,
  key: string
) => {
  if (!target) return;
  const middleware = middlewares?.[key];
  const processedValue = middleware
    ? (middleware as (v: unknown) => unknown)(value)
    : value;

  if (isFunction(target)) {
    target(processedValue);
  }
};

/**
 * Wraps a signal with middleware that transforms values on set.
 * Getter when called with no args, setter when called with one arg.
 * @internal
 */
export const wrapWithMiddleware = (sig: Signal<unknown>, middleware: (val: unknown) => unknown) => {
  function wrapped(value?: unknown) {
    return arguments.length === 0 ? sig() : sig(middleware(value));
  }
  return wrapped;
};

/**
 * Defines a property on the store object with full descriptors.
 * @internal
 */
export const defineStoreProperty = (result: Record<string, unknown>, key: string, value: unknown) =>
  Object.defineProperty(result, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
