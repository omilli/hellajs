import { signal, hasWindow } from "./internal/core";
import { matchPattern } from "./internal/match";
import type { RouteInfo } from "./types";

/**
 * Shared active-link predicate. Reads route path dynamically so it stays
 * correct after navigation changes the path without rebuilding the closure.
 * @internal
 */
export const activeFn = (pattern: string): boolean => {
  const path = route().path.split("?")[0]!;
  // Root is exact-only: ancestor matching treats a zero-segment pattern as a
  // prefix of every path, so active("/") would stay true everywhere. Match the
  // bare root exactly so a "/" nav link lights up only on "/".
  if (pattern === "/") return path === "/";
  return matchPattern(pattern, path, true) !== null;
};

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
  pending: false,
  meta: undefined,
  crumbs: Object.freeze([]),
  active: activeFn
});
