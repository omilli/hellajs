import type { RouteValue, RouteInfo, HistoryMode, Redirect, GlobalHooks, Routes } from "./types";
import { hooks, route, routes, redirects, notFound, mode } from "./state";
import { updateRoute, getHashPath } from "./utils";

const hasWindow = typeof window !== 'undefined';

/**
 * Initializes the router with a map of routes and optional hooks.
 * Sets up browser history listeners and triggers initial route resolution.
 * @param config Router configuration object containing routes, hooks, redirects, and notFound handler
 * @returns The initial route information after first resolution
 */
export function router(
  config: { routes: Routes; hooks?: GlobalHooks; notFound?: () => void; redirects?: Redirect[]; mode?: HistoryMode }
): RouteInfo {
  routes(config.routes as Record<string, RouteValue | string>);
  hooks(config.hooks || {});
  redirects(config.redirects || []);
  notFound(config.notFound || null);

  const routerMode: HistoryMode = config.mode || "history";
  mode(routerMode);

  const initialPath = hasWindow
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

  if (hasWindow) {
    if (routerMode === "hash") {
      window.addEventListener("hashchange", () => {
        route({
          ...route(),
          path: getHashPath()
        });
        updateRoute();
      });
    } else {
      window.addEventListener("popstate", () => {
        const currentPath = window.location.pathname + window.location.search;
        route({
          ...route(),
          path: currentPath
        });
        updateRoute();
      });
    }
  }

  queueMicrotask(() => updateRoute());

  return route();
}