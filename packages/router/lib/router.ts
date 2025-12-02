import type { RouteValue, RouterConfig, RouteInfo } from "./types";
import { hooks, route, routes, redirects, notFound } from "./state";
import { isUndefined, updateRoute } from "./utils";

/**
 * Initializes the router with a map of routes and optional hooks.
 * Sets up browser history listeners and triggers initial route resolution.
 * @template T The route map type extending base record
 * @param config Router configuration object containing routes, hooks, redirects, and notFound handler
 * @returns The initial route information after first resolution
 */
export function router<T extends Record<string, unknown>>(
  config: RouterConfig<T>
): RouteInfo {
  routes(config.routes as Record<string, RouteValue | string>);
  hooks(config.hooks || {});
  redirects(config.redirects || []);
  notFound(config.notFound || null);

  const initialPath = !isUndefined(window)
    ? window.location.pathname + window.location.search
    : "/";

  if (!route().handler) {
    route({
      ...route(),
      path: initialPath
    });
  }

  !isUndefined(window) && window.addEventListener("popstate", () => {
    const currentPath = window.location.pathname + window.location.search;

    route({
      ...route(),
      path: currentPath
    });
    updateRoute();
  });

  queueMicrotask(() => updateRoute());

  return route();
}