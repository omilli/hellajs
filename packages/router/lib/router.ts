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
 * @throws {Error} When config is null, undefined, an array, or not an object.
 */
export function router(config: RouterConfig): RouteInfo {
  if (config === null || config === undefined || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(`[router] router: config must be an object, received ${config === null ? "null" : typeof config}`);
  }
  routes(config.routes as Record<string, RouteValue | string>);
  hooks(config.hooks || {});
  redirects(config.redirects || []);
  notFound(config.notFound || null);
  scrollBehavior(config.scrollBehavior);
  inheritMeta(config.inheritMeta ?? false);

  const routerMode: HistoryMode = config.mode || "history";
  mode(routerMode);

  const intercept: boolean = config.intercept !== false;

  let initialPath: string;
  if (config.url !== undefined) {
    let parsedInitial: URL;
    try {
      parsedInitial = new URL(config.url, "http://hellajs.local");
    } catch {
      throw new Error(`[router] router: invalid url, received ${JSON.stringify(config.url)}`);
    }
    initialPath = parsedInitial.pathname + parsedInitial.search;
  } else {
    initialPath = hasWindow() && routerMode !== "memory"
      ? (routerMode === "hash" ? getHashPath() : window.location.pathname + window.location.search)
      : "/";
  }

  // An explicit `url` (SSR) always re-resolves against it; the `!route().handler`
  // guard is for client re-init only, so without it a 2nd+ `router({ url })` call in
  // one process keeps the first request's route. See router SSR tests.
  if (config.url !== undefined || !route().handler) {
    route({
      ...route(),
      path: initialPath
    });
  }

  previousPath(initialPath);

  // Memory mode attaches no listeners: no popstate/hashchange and no click
  // interception — the route is driven by navigate() alone.
  if (hasWindow() && routerMode !== "memory") {
    if (cleanupListener && isFunction(window.removeEventListener)) cleanupListener();

    let eventType: string;
    let handler: () => void;

    if (routerMode === "hash") {
      eventType = "hashchange";
      handler = () => {
        // Plain anchors (#section) change the hash without a route path — skip
        // resolution so they don't churn notFound. Only #/… hashes are routes.
        const hashPath = getHashPath();
        if (!hashPath.startsWith("/")) return;
        const verdict = updateRoute(hashPath);
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
        } catch (error) {
          // Malformed href — skip interception
          console.error("[router] intercept: malformed href, skipping", error);
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
          // Same URL differing only by hash (in-page anchor): leave the native
          // jump alone instead of re-navigating the current path.
          if (parsedURL.hash && parsedURL.pathname === window.location.pathname && parsedURL.search === window.location.search) return;
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

  updateRoute();

  return route();
}