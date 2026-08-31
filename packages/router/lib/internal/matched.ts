import { isFunction, isPlainObject, hasWindow } from "./core";
import { hooks, previousPath, scrollBehavior } from "./state";
import { executeHook, executeGlobalHook } from "./hooks";
import { route } from "../route";
import type { Handler, Params, RouteWithHooks, ScrollBehavior } from "../types";
import type { RouteMatch } from "./match";

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
    before: isObj ? (routeValue as RouteWithHooks).before || null : null,
    after: isObj ? (routeValue as RouteWithHooks).after || null : null
  };
}

/**
 * Result of evaluating a guard chain.
 * @internal
 */
export type GuardVerdict =
  | "pass"
  | "cancel"
  | { redirect: string };

/**
 * Interprets a single guard's return value into a verdict. A `Promise` return does NOT block
 * (sync-only pipeline) — navigation proceeds and only a rejection is logged.
 * @param result The guard's returned value.
 * @param errorPrefix Prefix for rejection logging.
 */
function interpretGuardResult(result: unknown, errorPrefix: string): GuardVerdict {
  if (result instanceof Promise) {
    result.catch((error) => console.error(`[router] ${errorPrefix}:`, error));
    return "pass";
  }
  if (result === false) {
    return "cancel";
  }
  if (typeof result === "string" && result.length > 0) {
    return { redirect: result };
  }
  return "pass";
}

/**
 * Invokes a route-level guard with arity dispatch (matching `executeHook`'s convention) and
 * interprets its result. A throw cancels and logs.
 * @param guard The route-level before hook.
 * @param params Cumulative parameters at this nesting level.
 * @param query Query parameters.
 * @param errorPrefix Prefix for error/rejection logging.
 */
function invokeRouteGuard(
  guard: Handler,
  params: Params,
  query: Params,
  errorPrefix: string
): GuardVerdict {
  const fn = guard as (a?: Params, b?: Params) => unknown;
  let result: unknown;
  try {
    if (Object.keys(params).length > 0) {
      result = fn(params, query);
    } else if (guard.length >= 2) {
      result = fn(undefined, query);
    } else {
      result = fn(query);
    }
  } catch (error) {
    console.error(`[router] ${errorPrefix}:`, error);
    return "cancel";
  }
  return interpretGuardResult(result, errorPrefix);
}

/**
 * Runs the global `before` hook and interprets its verdict. The hook receives `to` (the incoming
 * path, query included) and `from` (`route().path` pre-commit — the previous route).
 * @param toPath The path being navigated to (query included).
 * @returns The verdict: `"pass"`, `"cancel"`, or `{ redirect }`.
 */
function runGlobalBefore(toPath: string): GuardVerdict {
  const { before: globalBefore } = hooks();

  if (!isFunction(globalBefore)) {
    return "pass";
  }

  let result: unknown;
  try {
    result = (globalBefore as (to: string, from: string) => unknown)(toPath, route().path);
  } catch (error) {
    console.error("[router] Global before:", error);
    return "cancel";
  }
  return interpretGuardResult(result, "Global before");
}

/**
 * Runs the before-guard chain for a nested match (global before, then each nested route before
 * top-down) and returns the first non-pass verdict. Guards run BEFORE the route signal is written
 * so a cancel/redirect never produces an observable route change.
 * @internal
 * @param nestedMatches The parent-to-leaf nested match chain.
 * @param toPath The path being navigated to (query included), passed to the global before hook.
 * @returns The verdict: `"pass"`, `"cancel"`, or `{ redirect }`.
 */
export function runGuardsNested(nestedMatches: RouteMatch[], toPath: string): GuardVerdict {
  const globalVerdict = runGlobalBefore(toPath);
  if (globalVerdict !== "pass") {
    return globalVerdict;
  }

  let i = 0;
  const len = nestedMatches.length;
  while (i < len) {
    const { routeValue, params, query } = nestedMatches[i]!;
    i++;
    const before = extractRouteHooks(routeValue).before;
    if (isFunction(before)) {
      const verdict = invokeRouteGuard(before, params, query, "Nested before");
      if (verdict !== "pass") {
        return verdict;
      }
    }
  }

  return "pass";
}

/**
 * Runs the before-guard chain for a flat route (global before, then the route before) and returns
 * the first non-pass verdict. Guards run BEFORE the route signal is written so a cancel/redirect
 * never produces an observable route change.
 * @internal
 * @param routeValue The flat route value.
 * @param params Leaf-level parameters.
 * @param query Leaf-level query.
 * @param toPath The path being navigated to (query included), passed to the global before hook.
 * @returns The verdict: `"pass"`, `"cancel"`, or `{ redirect }`.
 */
export function runGuardsFlat(
  routeValue: unknown,
  params: Params,
  query: Params,
  toPath: string
): GuardVerdict {
  const globalVerdict = runGlobalBefore(toPath);
  if (globalVerdict !== "pass") {
    return globalVerdict;
  }

  const before = extractRouteHooks(routeValue).before;
  if (isFunction(before)) {
    const verdict = invokeRouteGuard(before, params, query, "hook");
    if (verdict !== "pass") {
      return verdict;
    }
  }

  return "pass";
}

/**
 * Executes route handler and after-hooks. The before chain is run separately by `runGuards`
 * before the route signal is written; this runs only on a pass: handler, then nested `after`
 * hooks bottom-up (LIFO), then the global `after` hook with `(to, from)` paths.
 * @internal
 * @param handler The main route handler.
 * @param params Route parameters.
 * @param query Query parameters.
 * @param toPath The path navigated to (query included), passed to the global after hook.
 * @param fromPath The pre-commit path navigated from (query included).
 * @param routeValue Optional route value for extracting hooks.
 * @param nestedMatches Optional nested route matches for nested execution.
 */
export function executeRouteWithHooks(
  handler: Handler | null,
  params: Params,
  query: Params,
  toPath: string,
  fromPath: string,
  routeValue?: unknown,
  nestedMatches?: RouteMatch[]
): void {
  const { after } = hooks();

  if (nestedMatches) {
    executeHook(handler, params, query, "Nested handler");

    let i = nestedMatches.length - 1;
    while (i >= 0) {
      const { routeValue, params, query } = nestedMatches[i]!;
      executeHook(extractRouteHooks(routeValue).after, params, query, "Nested after");
      i--;
    }
  } else {
    const { after: routeAfter } = extractRouteHooks(routeValue);

    executeHook(handler, params, query, "handler");
    executeHook(routeAfter, params, query, "hook");
  }

  executeGlobalHook(after, toPath, fromPath, "Global after");
}
