import {
  routes,
  hooks,
  redirects,
  notFound,
  mode,
  base,
  scrollBehavior,
  previousPath,
  inheritMeta
} from "./internal/state";
import { route, activeFn } from "./route";
import { resetListeners } from "./router";
import { resetScrollStack } from "./internal/resolve";
import { setMatchedChain } from "./internal/matched";

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
  base("");
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
  resetScrollStack();
  setMatchedChain(null);
}