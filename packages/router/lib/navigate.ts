import { isString, isNull } from "./internal/core";
import { EMPTY_OBJECT } from "./internal/utils";
import { go } from "./internal/resolve";
import { buildPath } from "./internal/path";
import type { NavigateOptions, Params } from "./types";

/**
 * Programmatically navigates to a new route with parameter substitution and query string handling.
 * Navigation may complete asynchronously when an async guard is involved — a Promise-returning
 * `before`/`leave` defers the commit with `route().pending === true` until it settles.
 * @template T The route path pattern.
 * @param path The route pattern to navigate to.
 * @param options Navigation options including params, query, replace, scroll, meta, and force.
 * @throws {Error} When path is null, undefined, or not a string.
 */
export function navigate<T extends string>(
  path: T,
  options: NavigateOptions<T> = {}
): void {
  if (!isString(path)) {
    throw new Error(`[router] navigate: path must be a string, received ${isNull(path) ? "null" : typeof path}`);
  }
  const { params = EMPTY_OBJECT, query = EMPTY_OBJECT, replace = false, scroll, meta, force } = options;
  go(buildPath(path, params as Params, query), { replace, scroll, meta, force });
}
