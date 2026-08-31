import type { Params } from "../types";

/**
 * Builds a URL from a route pattern by substituting params and appending a serialized query string.
 * @internal
 * @param path The route pattern to substitute into.
 * @param params Parameters substituted for `:param` and `:param?` tokens (encoded); the `"*"` key inserts raw.
 * @param query Query parameters appended with `?` when non-empty.
 * @returns The built URL string.
 */
export function buildPath(path: string, params: Params, query: Params): string {
  let result = path;

  const keys = Object.keys(params);
  let i = 0;
  const len = keys.length;
  while (i < len) {
    const key = keys[i++]!;
    result = result.replace(`:${key}?`, encodeURIComponent(params[key]!));
    result = result.replace(`:${key}`, encodeURIComponent(params[key]!));
  }

  // Replace wildcard * pattern: not encoded since wildcards contain raw path segments with /
  // Replacer function form — a string replacement would interpret $&, $$, etc. in the value.
  if (params["*"] !== undefined) {
    result = result.replace("*", () => params["*"]!);
  }

  // An absent optional `:param?` token strips together with its preceding
  // slash ("/users/:id?" without id → "/users"); unmatched required tokens
  // keep the slash-less strip below.
  result = result.replace(/\/:[^/?]+\?/g, "");
  if (result === "") {
    result = "/";
  }

  result = result.replace(/:([^/]+)/g, "");

  return Object.keys(query).length
    ? `${result}?${Object.entries(query).map(([k, v]) =>
      `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
    ).join("&")}`
    : result;
}
