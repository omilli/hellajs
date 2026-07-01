import { isFunction, hasWindow } from "./internal/core";
import type { RouterConfig, RouteValue, RouteInfo, HistoryMode } from "./types";
import { hooks, routes, redirects, notFound, mode, scrollBehavior, previousPath, inheritMeta } from "./internal/state";
import { route } from "./route";
import { updateRoute } from "./internal/resolve";
import { getHashPath } from "./internal/utils";
import { navigate } from "./navigate";

let cleanupListener: (() => void) | null = null;

/**
 * Detaches the popstate/hashchange and click listeners via the composed cleanup closure.
 * @internal
 */
export function resetListeners() {
  cleanupListener?.();
  cleanupListener = null;
}

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
  inheritMeta(config.inheritMeta ?? false);

  const routerMode: HistoryMode = config.mode || "history";
  mode(routerMode);

  const intercept: boolean = config.intercept !== false;

  let initialPath = "/";
  if (hasWindow()) {
    if (routerMode === "hash") {
      initialPath = getHashPath();
    } else {
      initialPath = window.location.pathname + window.location.search;
    }
  }

  if (!route().handler) {
    route({
      ...route(),
      path: initialPath
    });
  }

  previousPath(initialPath);

  if (hasWindow()) {
    if (cleanupListener && isFunction(window.removeEventListener)) cleanupListener();

    let eventType: string;
    let handler: () => void;

    if (routerMode === "hash") {
      eventType = "hashchange";
      handler = () => {
        const verdict = updateRoute(getHashPath());
        if (verdict === "cancelled") {
          window.history.replaceState(null, "", `#${previousPath()}`);
        }
      };
    } else {
      eventType = "popstate";
      handler = () => {
        const verdict = updateRoute(window.location.pathname + window.location.search);
        if (verdict === "cancelled") {
          window.history.replaceState(null, "", previousPath());
        }
      };
    }

    window.addEventListener(eventType, handler);
    cleanupListener = () => window.removeEventListener(eventType, handler);

    if (intercept) {
      const clickHandler = (event: MouseEvent) => {
        if (event.defaultPrevented) return;

        const anchor = (event.target instanceof Element) ? event.target.closest("a") : null;
        if (!anchor) return;

        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (anchor.target && anchor.target !== "_self") return;
        if (anchor.hasAttribute("download")) return;

        const href = anchor.getAttribute("href");
        if (href === null || href === undefined) return;

        let parsedURL: URL;
        try {
          parsedURL = new URL(anchor.href, window.location.href);
        } catch {
          // Malformed href — skip interception
          return;
        }

        if (parsedURL.protocol !== "http:" && parsedURL.protocol !== "https:") return;
        if (parsedURL.origin !== window.location.origin) return;

        let resolvedPath: string;
        if (routerMode === "hash") {
          const hash = parsedURL.hash;
          if (!hash || !hash.startsWith("#/")) return;
          resolvedPath = hash.slice(1);
        } else {
          resolvedPath = parsedURL.pathname + parsedURL.search;
        }

        event.preventDefault();
        navigate(resolvedPath);
      };

      document.addEventListener("click", clickHandler);
      const prevCleanup = cleanupListener;
      cleanupListener = () => {
        prevCleanup?.();
        document.removeEventListener("click", clickHandler);
      };
    }
  }

  queueMicrotask(() => updateRoute());

  return route();
}