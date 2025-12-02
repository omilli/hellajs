import { EMPTY_OBJECT, encode, go } from "./utils";
import type { Params, NavigateOptions } from "./types";

/**
 * Programmatically navigates to a new route with parameter substitution and query string handling.
 * Replaces :param patterns in the path with values from params object and removes unmatched patterns.
 * @param path The route pattern to navigate to (e.g., '/users/:id')
 * @param params Object containing parameter values for substitution (default: {})
 * @param query Object containing query string parameters (default: {})
 * @param options Navigation options including replace flag (default: {})
 */
export function navigate(
  path: string,
  params: Params = EMPTY_OBJECT,
  query: Params = EMPTY_OBJECT,
  options: NavigateOptions = {}
): void {
  for (const key in params)
    path = path.replace(`:${key}`, encode(params[key]));

  const queryString = Object.keys(query).length ? "?" + Object.entries(query).map(([k, v]) =>
    `${encode(k)}=${encode(v)}`
  ).join("&") : "";

  const finalPath = `${path.replace(/:([^/]+)/g, "")}${queryString}`;

  go(finalPath, options);
}
