import { isFunction } from "./internal/core";
import type { Params, Handler } from "./types";

/**
 * Executes a route or hook handler with proper error handling and parameter passing.
 * Handles different function arities and logs errors without blocking navigation.
 * @param fn The handler function to execute (may be null/undefined)
 * @param params Route parameters extracted from URL path
 * @param query Query parameters from URL search string
 * @param errorPrefix Error message prefix for console logging
 * @returns The result of the handler execution or undefined if handler is null
 * @throws Does not throw - all errors are caught and logged
 */
export function executeHook(
  fn: Handler | null | undefined,
  params: Params,
  query: Params,
  errorPrefix: string
): unknown {
  if (!fn) return;

  try {
    const hookResult = Object.keys(params).length > 0
      ? (fn as any)(params, query)
      : isFunction(fn) && fn.length >= 2
        ? (fn as any)(undefined as any, query)
        : (fn as any)(query);

    // Attach error handler to promises to prevent unhandled rejections
    if (hookResult instanceof Promise) {
      hookResult.catch((error) =>
        console.error(`Router ${errorPrefix}:`, error)
      );
    }
    return hookResult;
  } catch (error) {
    console.error(`Router ${errorPrefix}:`, error);
  }
}

/**
 * Executes a global hook with error handling.
 * @param hookFn The global hook function to execute
 * @param errorPrefix Error message prefix for logging
 */
export function executeGlobalHook(hookFn: Handler | null | undefined, errorPrefix: string): void {
  if (!isFunction(hookFn)) return;
  try {
    const result = hookFn();
    // Attach error handler to promises to prevent unhandled rejections
    if (result instanceof Promise) {
      result.catch((error) =>
        console.error(`Router ${errorPrefix}:`, error)
      );
    }
  } catch (error) {
    console.error(`Router ${errorPrefix}:`, error);
  }
}
