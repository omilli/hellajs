import { EMPTY_OBJECT, encode, go } from "./utils";
import type { Params, NavigateOptions, ExtractParams } from "./types";

/**
 * Programmatically navigates to a new route with parameter substitution and query string handling.
 * Replaces :param patterns in the path with values from params object and removes unmatched patterns.
 * @template T The route path pattern
 * @param path The route pattern to navigate to (e.g., '/users/:id')
 * @param params Object containing parameter values for substitution (default: {})
 * @param query Object containing query string parameters (default: {})
 * @param options Navigation options including replace flag (default: {})
 */
export function navigate<T extends string>(
  path: T,
  params: ExtractParams<T> = EMPTY_OBJECT as ExtractParams<T>,
  query: Params = EMPTY_OBJECT,
  options: NavigateOptions = {}
): void {
  const p = params as Record<string, string>;
  let result = path as string;

  // Replace :param patterns
  for (const key in p)
    result = result.replace(`:${key}`, encode(p[key]));

  // Replace wildcard * pattern (preserve slashes for paths)
  if (p["*"] !== undefined)
    result = result.replace("*", p["*"]);

  // Clean up unmatched :param patterns
  result = result.replace(/:([^/]+)/g, "");

  const queryString = Object.keys(query).length ? "?" + Object.entries(query).map(([k, v]) =>
    `${encode(k)}=${encode(v)}`
  ).join("&") : "";

  go(`${result}${queryString}`, options);
}
