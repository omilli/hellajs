import { isFunction } from "./core";
import type { Params, Handler } from "../types";

/**
 * Executes a route or hook handler with proper error handling and parameter passing.
 * @internal
 * @param handler The handler function to execute.
 * @param params Route parameters extracted from URL path.
 * @param query Query parameters from URL search string.
 * @param errorPrefix Error message prefix for console logging.
 * @returns The result of the handler execution or undefined.
 */
export function executeHook(
  handler: Handler | null | undefined,
  params: Params,
  query: Params,
  errorPrefix: string
): unknown {
  if (!handler) return;

  try {
    const fn = handler as (a?: Params, b?: Params) => unknown;
    let hookResult: unknown;
    if (Object.keys(params).length > 0) {
      hookResult = fn(params, query);
    } else if (isFunction(handler) && handler.length >= 2) {
      hookResult = fn(undefined, query);
    } else {
      hookResult = fn(query);
    }

    if (hookResult instanceof Promise) {
      hookResult.catch((error) =>
        console.error(`[router] ${errorPrefix}:`, error)
      );
    }
    return hookResult;
  } catch (error) {
    console.error(`[router] ${errorPrefix}:`, error);
  }
}

/**
 * Executes a global hook with error handling.
 * @internal
 * @param hookFn The global hook function to execute.
 * @param to The path navigated to (query included).
 * @param from The path navigated from (query included).
 * @param errorPrefix Error message prefix for logging.
 */
export function executeGlobalHook(
  hookFn: ((to: string, from: string) => unknown) | null | undefined,
  to: string,
  from: string,
  errorPrefix: string
): void {
  if (!isFunction(hookFn)) return;
  try {
    const result = hookFn(to, from);
    if (result instanceof Promise) {
      result.catch((error) =>
        console.error(`[router] ${errorPrefix}:`, error)
      );
    }
  } catch (error) {
    console.error(`[router] ${errorPrefix}:`, error);
  }
}
