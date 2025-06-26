import type { RouteMapOrRedirects, RouterHooks, RouteValue } from "./types";
import { hooks, route, routes } from "./state";
import { getHashPath, go, setHashPath, updateRoute } from "./utils";

let isHashMode = false;

export function router<T extends Record<string, unknown>>(
  routeMap: RouteMapOrRedirects<T>,
  globalHooks?: RouterHooks & {
    hash?: boolean;
  }
) {
  routes(routeMap as Record<string, RouteValue<any> | string>);
  hooks(globalHooks || {});

  if (globalHooks?.hash) {
    isHashMode = true;
    if (typeof window !== "undefined") {
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