import { signal, hasWindow } from "./internal/core";
import { matchPattern } from "./internal/match";
import type { RouteInfo } from "./types";

/**
 * Shared active-link predicate. Reads route path dynamically so it stays
 * correct after navigation changes the path without rebuilding the closure.
 * @internal
 */
export const activeFn = (pattern: string): boolean =>
  matchPattern(pattern, route().path.split("?")[0]!, true) !== null;

/**
 * Signal containing the current route information.
 */
export const route = signal<RouteInfo>({
  handler: null,
  params: {},
  query: {},
  path: hasWindow()
    ? window.location.pathname + window.location.search
    : "/",
  meta: undefined,
  crumbs: Object.freeze([]),
  active: activeFn
});
