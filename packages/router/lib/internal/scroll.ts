import { isFunction, hasWindow } from "./core";
import { scrollBehavior, previousPath } from "./state";
import type { ScrollBehavior } from "../types";

/**
 * Scroll positions saved at each committed push navigation (`go` pushState), popped on
 * popstate/hashchange restores — one entry per history push; replaces and init never push.
 * @internal
 */
export const scrollStack: { top: number; left: number }[] = [];

/**
 * Pops the saved scroll position for a pop navigation; null on pushes/replaces
 * (their commit pushes onto the stack in `go`) and when the stack is empty.
 * @param isPop Whether the navigation came from browser back/forward.
 * @internal
 */
export function takeSavedScroll(isPop: boolean | undefined): { top: number; left: number } | null {
  return isPop ? scrollStack.pop() ?? null : null;
}

/**
 * Clears the saved scroll-position stack so a fresh session (or test isolation)
 * starts clean. Called by `resetRouter()`.
 * @internal
 */
export function resetScrollStack(): void {
  scrollStack.length = 0;
}

/**
 * Handles scroll behavior after navigation.
 * @internal
 * @param toPath The path navigated to
 * @param inlineScroll Optional inline scroll behavior (highest priority)
 * @param routeScroll Optional route-level scroll behavior
 * @param isPop True when the navigation came from browser back/forward (popstate/hashchange)
 * @param savedPosition Scroll position captured when the returned-to page was last left;
 * null on pushes and replaces. Passed to custom fns only when `isPop` is true.
 */
export function handleScroll(
  toPath: string,
  inlineScroll?: ScrollBehavior | false,
  routeScroll?: ScrollBehavior | false,
  isPop?: boolean,
  savedPosition?: { top: number; left: number } | null
): void {
  const fromPath = previousPath();

  if (fromPath === toPath) {
    return;
  }

  if (inlineScroll === false) {
    previousPath(toPath);
    return;
  }

  if (inlineScroll === undefined && routeScroll === false) {
    previousPath(toPath);
    return;
  }

  const behavior = inlineScroll ?? routeScroll ?? scrollBehavior();
  if (!behavior || behavior === "auto") {
    previousPath(toPath);
    return;
  }

  if (behavior === "preserve") {
    previousPath(toPath);
    return;
  }

  let scrollPos: { top: number; left?: number } | null = null;

  if (behavior === "top") {
    scrollPos = { top: 0, left: 0 };
  } else if (isFunction(behavior)) {
    scrollPos = behavior(toPath, fromPath, isPop ? savedPosition ?? null : null);
  }

  if (scrollPos && hasWindow()) {
    window.scrollTo(scrollPos);
  }

  previousPath(toPath);
}
