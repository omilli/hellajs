import { isString, isNull } from "./internal/core";
import { EMPTY_OBJECT } from "./internal/utils";
import { buildPath } from "./internal/path";
import type { ExtractParams, Params } from "./types";

/**
 * Builds a typed URL string from a route pattern — the same substitution and query serialization
 * as `navigate`, without touching history. For plain `<a>` authoring, since same-origin link
 * clicks are intercepted by default.
 * @template T The route path pattern.
 * @param path The route pattern to build a URL from.
 * @param options Options including params and query.
 * @returns The built URL string.
 * @throws {Error} When path is null, undefined, or not a string.
 */
export function href<T extends string>(
  path: T,
  options: { params?: ExtractParams<T>; query?: Params } = {}
): string {
  if (!isString(path)) {
    throw new Error(`[router] href: path must be a string, received ${isNull(path) ? "null" : typeof path}`);
  }
  const { params = EMPTY_OBJECT, query = EMPTY_OBJECT } = options;
  return buildPath(path, params as Params, query);
}
