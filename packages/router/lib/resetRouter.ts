import {
  routes,
  hooks,
  redirects,
  notFound,
  mode,
  scrollBehavior,
  previousPath,
  inheritMeta
} from "./state";
import { resetListeners } from "./router";

/**
 * Factory-resets the router singleton state to defaults and detaches all listeners.
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
  resetListeners();
}