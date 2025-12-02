import { signal } from "@hellajs/core";
import type { RouteInfo, GlobalHooks, RouteValue, Redirect } from "./types";
import { isUndefined } from "./utils";

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
 * Signal containing the current route information.
 */
export const route = signal<RouteInfo>({
  handler: null,
  params: {},
  query: {},
  path: !isUndefined(window)
    ? window.location.pathname + window.location.search
    : "/"
});