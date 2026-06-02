import { EMPTY_OBJECT, encode, go } from "./utils";
import type { Params, NavigateOptions, ExtractParams } from "./types";

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
  const { params = EMPTY_OBJECT, query = EMPTY_OBJECT, replace = false, scroll, meta } = options;
  const p = params as Record<string, string>;
  let result = path as string;

  // Replace :param patterns
  const keys = Object.keys(p);
  for (let i = 0; i < keys.length; i++)
    result = result.replace(`:${keys[i]}`, encode(p[keys[i]]));

  // Replace wildcard * pattern: not encoded since wildcards contain raw path segments with /
  if (p["*"] !== undefined)
    result = result.replace("*", p["*"]);

  // Clean up unmatched :param patterns
  result = result.replace(/:([^/]+)/g, "");

  const queryString = Object.keys(query).length ? "?" + Object.entries(query).map(([k, v]) =>
    `${encode(k)}=${encode(v)}`
  ).join("&") : "";

  go(`${result}${queryString}`, { replace, scroll, meta });
}
