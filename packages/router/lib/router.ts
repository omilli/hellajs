import type { RouteMapOrRedirects, RouterHooks, RouteValue } from "./types";
import { hooks, route, routes, redirects, notFound } from "./state";
import { getHashPath, go, setHashPath, updateRoute } from "./utils";

let isHashMode = false;

/**
 * Initializes the router with a map of routes and optional hooks.
 * @template T
 * @param routeMap A map of route patterns to handlers or redirects.
 * @param globalHooks Global hooks and options for the router.
 * @returns The initial route information.
 */
export function router<T extends Record<string, unknown>>(
  config: {
    routes: RouteMapOrRedirects<T>,
    hooks?: RouterHooks,
    notFound?: () => void,
    hash?: boolean,
    redirects?: { from: string[]; to: string }[];
  }
) {
  routes(config.routes as Record<string, RouteValue<any> | string>);
  hooks(config.hooks || {});
  redirects(config.redirects || []);
  notFound(config.notFound || null);

  if (config.hash) {
    isHashMode = true;
    if (typeof window !== "undefined") {
      if (!window.location.hash) {
        window.location.hash = "/";
      }
      window.addEventListener("hashchange", () => {
        route({
          ...route(),
          path: getHashPath()
        });
        updateRoute();
      });
    }
    queueMicrotask(() => {
      route({
        ...route(),
        path: getHashPath()
      });
      updateRoute();
    });
  } else {
    isHashMode = false;
    if (typeof window !== "undefined") {
      window.addEventListener("popstate", () => {
        route({
          ...route(),
          path: window.location.pathname + window.location.search
        });
        updateRoute();
      });
    }
    queueMicrotask(() => updateRoute());
  }

  return route();
}

/**
 * Programmatically navigates to a new route.
 * @param pattern The route pattern to navigate to.
 * @param params The route parameters.
 * @param query The query parameters.
 * @param opts Navigation options.
 */
export function navigate(
  pattern: string,
  params: Record<string, string> = {},
  query: Record<string, string> = {},
  opts: { replace?: boolean, hash?: boolean } = {}
) {
  let path = pattern;
  for (const key in params) {
    path = path.replace(`:${key}`, encodeURIComponent(params[key]));
  }
  path = path.replace(/:([^/]+)/g, "");
  const queryString = Object.keys(query).length
    ? "?" +
    Object.entries(query)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&")
    : "";
  const useHash = opts.hash ?? isHashMode;
  if (useHash) {
    setHashPath(path + queryString, opts);
    route({ ...route(), path: getHashPath() });
    updateRoute();
  } else {
    go(path + queryString, opts);
  }
}
