import { isFunction, isPlainObject, hasWindow } from "./core";
import { hooks, previousPath, scrollBehavior } from "../state";
import { executeHook, executeGlobalHook } from "../hooks";
import type { Handler, Params, RouteMatch, RouteWithHooks, GlobalHooks, ScrollBehavior } from "../types";

/**
 * Handles scroll behavior after navigation.
 * @internal
 * @param toPath The path navigated to
 * @param inlineScroll Optional inline scroll behavior (highest priority)
 * @param routeScroll Optional route-level scroll behavior
 */
export function handleScroll(
  toPath: string,
  inlineScroll?: ScrollBehavior | false,
  routeScroll?: ScrollBehavior | false
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
    scrollPos = behavior(toPath, fromPath);
  }

  if (scrollPos && hasWindow()) {
    window.scrollTo(scrollPos);
  }

  previousPath(toPath);
}

/**
 * Extracts handler function from a route value.
 * @internal
 * @param routeValue The route value to extract handler from.
 * @returns The handler function or null.
 */
export function extractHandler(routeValue: unknown): Handler | null {
  if (isFunction(routeValue)) {
    return routeValue as Handler;
  }

  if (isPlainObject(routeValue)) {
    return isFunction((routeValue as RouteWithHooks).handler) ? (routeValue as RouteWithHooks).handler as Handler : null;
  }

  return null;
}

/**
 * Extracts meta from a route value.
 * @internal
 * @param routeValue The route value to extract meta from.
 * @returns The meta object or undefined.
 */
export function extractMeta(routeValue: unknown): Record<string, unknown> | undefined {
  if (isPlainObject(routeValue)) {
    return (routeValue as RouteWithHooks).meta;
  }
  return undefined;
}

/**
 * Extracts the per-route inheritMeta flag from a route value.
 * @internal
 * @param routeValue The route value to extract the flag from.
 * @returns The inheritMeta flag or undefined.
 */
export function extractInheritMeta(routeValue: unknown): boolean | undefined {
  if (isPlainObject(routeValue)) {
    return (routeValue as RouteWithHooks).inheritMeta;
  }
  return undefined;
}

/**
 * Extracts scroll behavior from a route value.
 * @internal
 * @param routeValue The route value to extract scroll from.
 * @returns The scroll behavior or undefined.
 */
export function extractScroll(routeValue: unknown): ScrollBehavior | false | undefined {
  if (isPlainObject(routeValue) && Object.hasOwn(routeValue, "scroll")) {
    return (routeValue as RouteWithHooks).scroll;
  }
  return undefined;
}

/**
 * Extracts before and after hooks from a route value.
 * @internal
 * @param routeValue The route value to extract hooks from.
 * @returns Object containing before and after hook functions.
 */
export function extractRouteHooks(routeValue: unknown): { before: Handler | null; after: Handler | null } {
  const isObj = isPlainObject(routeValue);
  return {
    before: isObj ? (routeValue as GlobalHooks).before || null : null,
    after: isObj ? (routeValue as GlobalHooks).after || null : null
  };
}

/**
 * Executes route handler and hooks in the correct order.
 * @internal
 * @param handler The main route handler.
 * @param params Route parameters.
 * @param query Query parameters.
 * @param routeValue Optional route value for extracting hooks.
 * @param nestedMatches Optional nested route matches for nested execution.
 */
export function executeRouteWithHooks(
  handler: Handler | null,
  params: Params,
  query: Params,
  routeValue?: unknown,
  nestedMatches?: RouteMatch[]
): void {
  const { before, after } = hooks();

  executeGlobalHook(before, "Global before");

  if (nestedMatches) {
    {
      let i = 0;
      const len = nestedMatches.length;
      while (i < len) {
        const { routeValue, params, query } = nestedMatches[i]!;
        i++;
        executeHook(extractRouteHooks(routeValue).before, params, query, "Nested before");
      }
    }

    executeHook(handler, params, query, "Nested handler");

    let i = nestedMatches.length - 1;
    while (i >= 0) {
      const { routeValue, params, query } = nestedMatches[i]!;
      executeHook(extractRouteHooks(routeValue).after, params, query, "Nested after");
      i--;
    }
  } else {
    const { before: routeBefore, after: routeAfter } = extractRouteHooks(routeValue);

    executeHook(routeBefore, params, query, "hook");
    executeHook(handler, params, query, "handler");
    executeHook(routeAfter, params, query, "hook");
  }

  executeGlobalHook(after, "Global after");
}
