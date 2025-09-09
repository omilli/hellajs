import type { RouteValue, RouteMatch, Params } from "./types";
import { sortRoutesBySpecificity, decode, isString, isFunction, isObject, isRouteWithHooks, hasChildren, EMPTY_OBJECT } from "./utils";

/**
 * Parses URL query string into parameters object.
 * @param queryString Optional query string to parse
 * @returns Object containing parsed query parameters
 */
function parseQuery(queryString?: string): Params {
  if (!queryString) return EMPTY_OBJECT;

  const params: Record<string, string> = {};
  for (const part of queryString.replace(/^\?/, "").split("&")) {
    if (!part) continue;
    const [k, v = ""] = part.split("=");
    params[decode(k)] = decode(v);
  }
  return params;
}

/**
 * Matches a route pattern against a path and extracts parameters.
 * @param pattern The route pattern to match against
 * @param path The path to match
 * @param isNested Whether this is a nested route match
 * @returns Match result with parameters and remaining path, or null if no match
 */
function matchPattern(pattern: string, path: string, isNested = false): { params: Params; remainingPath: string } | null {
  const patternPath = pattern.split("?")[0];
  const patternParts = patternPath.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);

  const hasWildcard = patternParts[patternParts.length - 1] === "*";
  const baseLength = hasWildcard ? patternParts.length - 1 : patternParts.length;

  if (!hasWildcard && patternParts.length > pathParts.length) return null;
  if (!isNested && !hasWildcard && pathParts.length > patternParts.length) return null;
  if (hasWildcard && pathParts.length < baseLength) return null;

  let params: Record<string, string> = {};
  let hasParams = false;

  for (let i = 0; i < baseLength; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(":")) {
      if (!hasParams) {
        hasParams = true;
      }
      params[patternPart.slice(1)] = pathPart;
    } else if (patternPart !== pathPart)
      return null;
  }

  let remainingPath = "";
  if (hasWildcard) {
    if (!hasParams) {
      hasParams = true;
    }
    params["*"] = pathParts.slice(baseLength).join("/");
  } else if (pathParts.length > baseLength)
    remainingPath = `/${pathParts.slice(baseLength).join("/")}`;

  return {
    params: hasParams ? params : EMPTY_OBJECT,
    remainingPath
  };
}

/**
 * Matches nested routes and returns all matching route segments.
 * @param routeMap The route map to match against
 * @param path The path to match
 * @returns Array of route matches or null if no match found
 */
export function matchNestedRoute(
  routeMap: Record<string, RouteValue | string>,
  path: string
): RouteMatch[] | null {
  const [pathWithoutQuery, queryString] = path.split("?");
  const query = parseQuery(queryString);

  const routeEntries = Object.entries(routeMap)
    .filter(([, value]) => !isString(value))
    .sort(sortRoutesBySpecificity);

  for (const [pattern, routeValue] of routeEntries) {
    const match = matchPattern(pattern, pathWithoutQuery, true);
    if (!match) continue;

    const currentMatch: RouteMatch = {
      routeValue: routeValue as RouteValue,
      params: match.params,
      query,
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

      const hasHandler = isFunction(routeValue) || (isRouteWithHooks(routeValue));
      return hasHandler ? [currentMatch] : null;
    }

    return [currentMatch];
  }

  return null;
}

/**
 * Matches a single route pattern against a path.
 * @param routePattern The pattern to match against
 * @param path The path to match
 * @returns Match result with parameters and query, or null if no match
 */
export function matchRoute(routePattern: string, path: string): { params: Params; query: Params } | null {
  const [, queryString] = path.split("?");
  const match = matchPattern(routePattern, path.split("?")[0], false);

  return match ? {
    params: match.params,
    query: parseQuery(queryString)
  } : null;
}