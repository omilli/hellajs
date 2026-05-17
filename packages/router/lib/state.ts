import { signal } from "./internal/core";
import type { RouteInfo, GlobalHooks, RouteValue, Redirect, HistoryMode, ScrollBehavior } from "./types";

const hasWindow = typeof window !== 'undefined';

/**
 * Signal containing the current route map.
 */
export const routes = signal<Record<string, RouteValue | string>>({});

/**
 * Signal containing global hooks configuration.
 */
export const hooks = signal<GlobalHooks>({});

/**
 * Signal containing redirect rules.
 */
export const redirects = signal<Redirect[]>([]);

/**
 * Signal containing the not found handler.
 */
export const notFound = signal<(() => void) | null>(null);

/**
 * Signal containing the current history mode.
 */
export const mode = signal<HistoryMode>("history");

/**
 * Signal containing scroll behavior configuration.
 */
export const scrollBehavior = signal<ScrollBehavior | undefined>(undefined);

/**
 * Previous path for scroll behavior context.
 */
export const previousPath = signal<string>("/");

/**
 * Signal containing the current route information.
 */
export const route = signal<RouteInfo>({
  handler: null,
  params: {},
  query: {},
  path: hasWindow
    ? window.location.pathname + window.location.search
    : "/",
  meta: undefined
});