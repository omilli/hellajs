import { isPlainObject, hasWindow } from "./core";
import { mode } from "./state";
import { updateRoute } from "./resolve";
import type {
  Params,
  Crumb,
  RouteValue,
  RouteWithHooks,
  ScrollBehavior
} from "../types";

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

/**
 * Resolves a URL through the route pipeline and, only on a committed match (guards passed),
 * updates the browser history. A cancelled guard produces no history change; a redirect's nested
 * `go` already updated history, so the outer call skips.
 * @internal
 * @param to The URL to navigate to.
 * @param options Navigation options including replace, scroll, and meta.
 */
export function go(
  to: string,
  options: {
    readonly replace?: boolean;
    scroll?: ScrollBehavior | false;
    meta?: Record<string, unknown>;
  } = {}
): void {
  const { replace = false, scroll, meta } = options;
  const isHashMode = mode() === "hash";
  const finalTo = isHashMode ? `#${to}` : to;
  const action = replace ? "replaceState" : "pushState";

  const verdict = updateRoute(to, scroll, meta);

  if (verdict === "matched" && hasWindow()) {
    window.history[action](null, "", finalTo);
  }
}
