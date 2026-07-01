import { EMPTY_OBJECT, go } from "./internal/utils";
import type { NavigateOptions } from "./types";

/**
 * Programmatically navigates to a new route with parameter substitution and query string handling.
 * @template T The route path pattern.
 * @param path The route pattern to navigate to.
 * @param options Navigation options including params, query, replace, scroll, and meta.
 */
export function navigate<T extends string>(
  path: T,
  options: NavigateOptions<T> = {}
): void {
  if (path === null || path === undefined || typeof path !== "string") {
    throw new Error(`[router] navigate: path must be a string, received ${path === null ? "null" : typeof path}`);
  }
  const { params = EMPTY_OBJECT, query = EMPTY_OBJECT, replace = false, scroll, meta } = options;
  const p = params as Record<string, string>;
  let result = path as string;

  const keys = Object.keys(p);
  let i = 0;
  const len = keys.length;
  while (i < len) {
    const key = keys[i++]!;
    result = result.replace(`:${key}`, encodeURIComponent(p[key]!));
  }

  // Replace wildcard * pattern: not encoded since wildcards contain raw path segments with /
  if (p["*"] !== undefined) {
    result = result.replace("*", p["*"]);
  }

  result = result.replace(/:([^/]+)/g, "");

  const queryString = Object.keys(query).length ? "?" + Object.entries(query).map(([k, v]) =>
    `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
  ).join("&") : "";

  go(`${result}${queryString}`, { replace, scroll, meta });
}
