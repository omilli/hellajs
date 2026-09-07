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
import { resetAsyncNavigation } from "./internal/resolve";
import { resetScrollStack } from "./internal/scroll";
import { setMatchedChain } from "./internal/matched";
import { EMPTY_OBJECT, EMPTY_CRUMBS } from "./internal/utils";

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
    params: EMPTY_OBJECT,
    query: EMPTY_OBJECT,
    path: "/",
    pending: false,
    meta: undefined,
    crumbs: EMPTY_CRUMBS,
    active: activeFn
  });
  resetListeners();
  resetScrollStack();
  setMatchedChain(null);
  resetAsyncNavigation();
}