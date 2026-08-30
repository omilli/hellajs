import { isFunction, isObject } from "./core";
import type { Signal } from "./core";

/**
 * @internal
 * Property names reserved by the store implementation
 */
export const reservedKeys = new Set(["snapshot", "update", "cleanup", "subscribe"]);

/**
 * @internal
 * Detects store-shaped values: objects with snapshot/update/cleanup methods.
 * Used to allow store composition without triggering reserved key collision.
 * @param value The value to check.
 * @returns True if value looks like a store.
 */
export function isStore(value: unknown): boolean {
  return isObject(value)
    && Object.hasOwn(value, "snapshot")
    && Object.hasOwn(value, "update")
    && Object.hasOwn(value, "cleanup")
    && isFunction((value as { snapshot: unknown }).snapshot)
    && isFunction((value as { update: unknown }).update)
    && isFunction((value as { cleanup: unknown }).cleanup);
}

/**
 * @internal
 * Checks if value is object or function (for cleanup traversal).
 * @param value The value to check.
 * @returns True if value is a non-null object or a function.
 */
export function isObjectOrFunction(value: unknown): boolean {
  return isObject(value) || isFunction(value);
}

/**
 * @internal
 * Applies an update to a target signal, optionally through middleware.
 */
export function applyUpdate(
  target: unknown,
  value: unknown,
  middlewares: Record<string, unknown> | undefined,
  key: string
) {
  if (!target) return;
  const middleware = middlewares?.[key];
  const processedValue = middleware
    ? (middleware as (v: unknown) => unknown)(value)
    : value;

  if (isFunction(target)) {
    target(processedValue);
  }
}

/**
 * @internal
 * Wraps a signal with middleware that transforms values on set.
 * Getter when called with no args, setter when called with one arg.
 */
export function wrapWithMiddleware(sig: Signal<unknown>, middleware: (val: unknown) => unknown) {
  function wrapped(value?: unknown) {
    return arguments.length === 0 ? sig() : sig(middleware(value));
  }
  return wrapped;
}

/**
 * @internal
 * Defines a property on the store object with full descriptors.
 */
export function defineStoreProperty(result: Record<string, unknown>, key: string, value: unknown) {
  return Object.defineProperty(result, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}
