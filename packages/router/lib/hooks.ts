import type { Params, Handler } from "./types";
import { isFunction, isObject, isUndefined } from "./utils";

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
): Promise<unknown> | unknown | undefined {
  if (!fn) return;

  try {
    const hookResult = Object.keys(params).length > 0
      ? (fn as any)(params, query)
      : isFunction(fn) && fn.length >= 2
        ? (fn as any)(undefined as any, query)
        : (fn as any)(query);

    extractResult(hookResult);
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
export function executeGlobalHook(hookFn: (() => Promise<unknown> | unknown) | null | undefined, errorPrefix: string): void {
  if (!isFunction(hookFn)) return;
  try {
    extractResult(hookFn());
  } catch (error) {
    console.error(`Router ${errorPrefix}:`, error);
  }
}

function extractResult(result: Promise<unknown> | unknown): void {
  result && isObject(result)
    && !isUndefined((result as Promise<unknown>).then)
    && (result as Promise<unknown>).catch((error) =>
      console.error("Router hook async:", error)
    );
}
