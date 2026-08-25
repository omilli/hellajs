import { isFunction, isString } from "./core";
import type { RouteValue, Params, RouteWithHooks } from "../types";
import { sortRoutesBySpecificity, hasChildren, EMPTY_OBJECT } from "./utils";

/**
 * Internal route matching result with extracted parameters.
 * @internal
 */
export type RouteMatch = {
  /** Route value that was matched */
  routeValue: RouteValue;
  /** Pattern string that matched at this nesting level */
  pattern: string;
  /** Parameters extracted from the matched path */
  params: Params;
  /** Query parameters from the URL */
  query: Params;
  /** Remaining unmatched path segment for nested matching */
  remainingPath: string;
  /** Path input at this nesting level */
  fullPath: string;
  /** Metadata from the matched route */
  meta?: Record<string, unknown>;
};

/**
 * Parses URL query string into parameters object.
 * @param queryString Optional query string to parse.
 * @returns Object containing parsed query parameters.
 */
function parseQuery(queryString?: string): Params {
  if (!queryString) {
    return EMPTY_OBJECT;
  }

  const params: Record<string, string> = {};
  const parts = queryString.replace(/^\?/, "").split("&");
  let i = 0;
  const len = parts.length;
  while (i < len) {
    const part = parts[i++]!;
    if (!part) {
      continue;
    }
    const [k, v = ""] = part.split("=");
    params[decodeURIComponent(k!)] = decodeURIComponent(v);
  }
  return params;
}

/**
 * Matches a route pattern against a path and extracts parameters.
 * @internal
 * @param pattern The route pattern to match against.
 * @param path The path to match.
 * @param isNested Whether this is a nested route match.
 * @returns Match result with parameters and remaining path, or null.
 */
export function matchPattern(pattern: string, path: string, isNested = false): { params: Params; remainingPath: string } | null {
  const patternPath = pattern.split("?")[0]!;
  const patternParts = patternPath.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);

  const hasWildcard = patternParts[patternParts.length - 1] === "*";
  const baseLength = hasWildcard ? patternParts.length - 1 : patternParts.length;

  if (!hasWildcard && patternParts.length > pathParts.length) {
    return null;
  }
  if (!isNested && !hasWildcard && pathParts.length > patternParts.length) {
    return null;
  }
  if (hasWildcard && pathParts.length < baseLength) {
    return null;
  }

  const params: Record<string, string> = {};
  let hasParams = false;

  let i = 0;
  const len = baseLength;
  while (i < len) {
    const patternPart = patternParts[i]!;
    const pathPart = pathParts[i]!;
    i++;

    if (patternPart.startsWith(":")) {
      hasParams = true;
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  let remainingPath = "";
  if (hasWildcard) {
    hasParams = true;
    params["*"] = decodeURIComponent(pathParts.slice(baseLength).join("/"));
  } else if (pathParts.length > baseLength) {
    remainingPath = `/${pathParts.slice(baseLength).join("/")}`;
  }

  return {
    params: hasParams ? params : EMPTY_OBJECT,
    remainingPath
  };
}

/**
 * Matches one route-map entry against a path and resolves its nested chain.
 * @internal
 * @param pattern The route pattern for this entry.
 * @param routeValue The route value for this entry.
 * @param path The full path to match including query string.
 * @returns Array of route matches with inherited parameters or null.
 */
export function matchNestedEntry(
  pattern: string,
  routeValue: RouteValue | string,
  path: string
): RouteMatch[] | null {
  const [pathWithoutQuery, queryString] = path.split("?") as [string, string | undefined];

  const match = matchPattern(pattern, pathWithoutQuery, true);
  if (!match) {
    return null;
  }

  const currentMatch: RouteMatch = {
    routeValue: routeValue as RouteValue,
    pattern,
    params: match.params,
    query: parseQuery(queryString),
    remainingPath: match.remainingPath,
    fullPath: path
  };

  const nonStringRouteValue = routeValue as RouteValue;
  if (hasChildren(nonStringRouteValue) && match.remainingPath) {
    const childMatches = matchNestedRoute(
      nonStringRouteValue.children as Record<string, RouteValue | string>,
      match.remainingPath + (queryString ? `?${queryString}` : "")
    );

    if (childMatches) {
      const updatedChildMatches = childMatches.map(childMatch => ({
        ...childMatch,
        params: { ...match.params, ...childMatch.params }
      }));
      return [currentMatch, ...updatedChildMatches];
    }

    const hasHandler = isFunction(routeValue) || isFunction((routeValue as RouteWithHooks).handler);
    return hasHandler ? [currentMatch] : null;
  }

  return [currentMatch];
}

/**
 * Matches nested routes and returns all matching route segments with parameter inheritance.
 * @internal
 * @param routeMap The route map to match against.
 * @param path The full path to match including query string.
 * @returns Array of route matches with inherited parameters or null.
 */
export function matchNestedRoute(
  routeMap: Record<string, RouteValue | string>,
  path: string
): RouteMatch[] | null {
  const routeEntries = Object.entries(routeMap)
    .filter(([, value]) => !isString(value))
    .sort(sortRoutesBySpecificity);

  let i = 0;
  const len = routeEntries.length;
  while (i < len) {
    const [pattern, routeValue] = routeEntries[i]!;
    i++;

    const matches = matchNestedEntry(pattern, routeValue, path);
    if (matches) {
      return matches;
    }
  }

  return null;
}

/**
 * Matches a single route pattern against a path.
 * @internal
 * @param routePattern The pattern to match against.
 * @param path The path to match.
 * @returns Match result with parameters and query, or null.
 */
export function matchRoute(routePattern: string, path: string): { params: Params; query: Params } | null {
  const [, queryString] = path.split("?") as [string, string | undefined];
  const match = matchPattern(routePattern, path.split("?")[0]!, false);

  return match ? {
    params: match.params,
    query: parseQuery(queryString)
  } : null;
}
