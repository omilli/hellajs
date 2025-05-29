import { flushEffects } from "../reactive";
import type { RouteMapOrRedirects, RouteValue } from "../types";
import { hooks, route, routes } from "./state";
import { go, updateRoute } from "./utils";

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    route.set({
      ...route(),
      path: window.location.pathname + window.location.search
    });
    updateRoute();
  });
}

export function router<T extends Record<string, unknown>>(
  routeMap: RouteMapOrRedirects<T>,
  globalHooks?: {
    before?: () => unknown;
    after?: () => unknown;
    404?: () => unknown;
    redirects?: { from: string[]; to: string }[];
  }
) {
  routes.set(routeMap as Record<string, RouteValue<any> | string>);
  hooks.set(globalHooks || {});

  (async () => {
    await flushEffects();
    updateRoute();
  })();

  return route();
}

export function navigate(
  pattern: string,
  params: Record<string, string> = {},
  query: Record<string, string> = {},
  opts: { replace?: boolean } = {}
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
  go(path + queryString, opts);
}
