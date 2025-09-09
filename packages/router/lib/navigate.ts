import { EMPTY_OBJECT, encode, go } from "./utils";
import type { Params, NavigateOptions } from "./types";

/**
 * Programmatically navigates to a new route.
 * @param path The route pattern to navigate to.
 * @param params The route parameters.
 * @param query The query parameters.
 * @param options Navigation options.
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
