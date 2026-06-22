import { signal, hasWindow } from "./internal/core";
import { matchPattern } from "./match";
import type { RouteInfo, GlobalHooks, RouteValue, Redirect, HistoryMode, ScrollBehavior } from "./types";

/**
 * Signal containing the current route map.
 * @internal
 */
export const routes = signal<Record<string, RouteValue | string>>({});

/**
 * Signal containing global hooks configuration.
 * @internal
 */
export const hooks = signal<GlobalHooks>({});

/**
 * Signal containing redirect rules.
 * @internal
 */
export const redirects = signal<Redirect[]>([]);

/**
 * Signal containing the not found handler.
 * @internal
 */
export const notFound = signal<string | (() => void) | null>(null);

/**
 * Signal containing the current history mode.
 * @internal
 */
export const mode = signal<HistoryMode>("history");

/**
 * Signal containing scroll behavior configuration.
 * @internal
 */
export const scrollBehavior = signal<ScrollBehavior | undefined>(undefined);

/**
 * Previous path used by scroll behavior to determine navigation direction.
 * @internal
 */
export const previousPath = signal<string>("/");

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