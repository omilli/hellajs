import { isFunction } from "./internal/core";
import { hasWindow } from "./internal/core";
import type { RouterConfig, RouteValue, RouteInfo, HistoryMode } from "./types";
import { hooks, route, routes, redirects, notFound, mode, scrollBehavior, previousPath } from "./state";
import { updateRoute, getHashPath } from "./utils";

let cleanupListener: (() => void) | null = null;

/**
 * Initializes the router with a map of routes and optional hooks.
 * @param config Router configuration object containing routes, hooks, redirects, and notFound handler.
 * @returns The initial route information after first resolution.
 */
export function router(config: RouterConfig): RouteInfo {
  routes(config.routes as Record<string, RouteValue | string>);
  hooks(config.hooks || {});
  redirects(config.redirects || []);
  notFound(config.notFound || null);
  scrollBehavior(config.scrollBehavior);

  const routerMode: HistoryMode = config.mode || "history";
  mode(routerMode);

  const initialPath = hasWindow()
    ? routerMode === "hash"
      ? getHashPath()
      : window.location.pathname + window.location.search
    : "/";

  if (!route().handler) {
    route({
      ...route(),
      path: initialPath
    });
  }

  // Initialize previousPath to initial path for scroll tracking
  previousPath(initialPath);

  if (hasWindow()) {
    if (cleanupListener && isFunction(window.removeEventListener)) cleanupListener();

    let eventType: string;
    let handler: () => void;

    if (routerMode === "hash") {
      eventType = "hashchange";
      handler = () => {
        route({ ...route(), path: getHashPath() });
        updateRoute();
      };
    } else {
      eventType = "popstate";
      handler = () => {
        const currentPath = window.location.pathname + window.location.search;
        route({ ...route(), path: currentPath });
        updateRoute();
      };
    }

    window.addEventListener(eventType, handler);
    cleanupListener = () => window.removeEventListener(eventType, handler);
  }

  queueMicrotask(() => updateRoute());

  return route();
}