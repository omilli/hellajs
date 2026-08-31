import { isPlainObject } from "./core";
import type { Crumb, Params, RouteValue, RouteWithHooks } from "../types";

/**
 * Frozen empty parameters object for memory efficiency.
 * @internal
 */
export const EMPTY_OBJECT = Object.freeze({}) as Params;

/**
 * Frozen empty crumbs array for memory efficiency.
 * @internal
 */
export const EMPTY_CRUMBS: ReadonlyArray<Crumb> = Object.freeze([]);

/**
 * Checks if a route value has nested children.
 * @internal
 * @param routeValue The route value to check.
 * @returns True if the route has children.
 */
export const hasChildren = (routeValue: RouteValue): routeValue is RouteWithHooks =>
  isPlainObject(routeValue) && !!(routeValue as RouteWithHooks).children;

/**
 * Strips the base path prefix from a URL path, preserving the query string.
 * @internal
 * @param path URL path including any query string.
 * @param basePath Normalized base path (no trailing slash); empty string is an identity no-op.
 * @returns The base-less path, or the original path when the base does not prefix it.
 */
export function stripBase(path: string, basePath: string): string {
  if (!basePath) return path;
  if (path === basePath) return "/";
  if (path.startsWith(basePath + "/")) return path.slice(basePath.length);
  if (path.startsWith(basePath + "?")) return "/" + path.slice(basePath.length);
  return path;
}

/**
 * Extracts the path from the hash portion of the URL.
 * @internal
 * @returns The path from hash (without #), or "/" if empty.
 */
export function getHashPath(): string {
  const hash = window.location.hash;
  return hash ? hash.slice(1) : "/";
}

/**
 * Sorts routes by specificity for proper matching precedence.
 * @internal
 * @param a First route entry.
 * @param b Second route entry.
 * @returns Sort comparison result.
 */
export function sortRoutesBySpecificity([patternA]: [string, unknown], [patternB]: [string, unknown]): number {
  const aHasWildcard = patternA.includes("*");
  const bHasWildcard = patternB.includes("*");
  if (aHasWildcard && !bHasWildcard) {
    return 1;
  }
  if (!aHasWildcard && bHasWildcard) {
    return -1;
  }

  const aSpecificity = patternA.split("/").filter(Boolean).length;
  const bSpecificity = patternB.split("/").filter(Boolean).length;
  return bSpecificity - aSpecificity;
}
