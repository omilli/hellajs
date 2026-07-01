import {
  routes,
  hooks,
  redirects,
  notFound,
  mode,
  scrollBehavior,
  previousPath,
  inheritMeta
} from "./internal/state";
import { route, activeFn } from "./route";
import { resetListeners } from "./router";

/**
 * Factory-resets the router singleton to defaults and detaches all listeners.
 * Does NOT mutate `window.location` or `history`.
 */
export function resetRouter(): void {
  routes({});
  hooks({});
  redirects([]);
  notFound(null);
  mode("history");
  scrollBehavior(undefined);
  previousPath("/");
  inheritMeta(false);
  route({
    handler: null,
    params: {},
    query: {},
    path: "/",
    meta: undefined,
    crumbs: Object.freeze([]),
    active: activeFn
  });
  resetListeners();
}