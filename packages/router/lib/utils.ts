import { isFunction, isPlainObject, isString } from "./internal/core";
import { route, routes, notFound, redirects, hooks, mode } from "./state";
import { matchRoute, matchNestedRoute } from "./match";
import { executeHook, executeGlobalHook } from "./hooks";
import type {
  RouteInfo,
  GlobalHooks,
  RouteWithHooks,
  RouteValue,
  Handler,
  Params,
  RouteMatch
} from "./types";

const hasWindow = typeof window !== 'undefined';

/**
 * Frozen empty parameters object for memory efficiency.
 */
export const EMPTY_OBJECT = Object.freeze({}) as Params;

/**
 * Checks if a value is a route with hooks.
 * @param value The value to check
 * @returns True if the value is a RouteWithHooks object
 */
export const isRouteWithHooks = (value: unknown): value is RouteWithHooks =>
  isPlainObject(value) && (value as RouteWithHooks).handler !== undefined;

/**
 * Checks if a route value has nested children.
 * @param routeValue The route value to check
 * @returns True if the route has children
 */
export const hasChildren = (routeValue: RouteValue): routeValue is RouteWithHooks =>
  isPlainObject(routeValue) && !!(routeValue as RouteWithHooks).children;

/**
 * URL-safe encoding function.
 */
export const encode = encodeURIComponent;

/**
 * URL-safe decoding function.
 */
export const decode = decodeURIComponent;

/**
 * Extracts the path from the hash portion of the URL.
 * @returns The path from hash (without #), or "/" if empty
 */
export function getHashPath(): string {
  const hash = window.location.hash;
  return hash ? hash.slice(1) : "/";
}

/**
 * Sorts routes by specificity for proper matching precedence.
 * @param a First route entry
 * @param b Second route entry  
 * @returns Sort comparison result
 */
export function sortRoutesBySpecificity([a]: [string, unknown], [b]: [string, unknown]): number {
  const aHasWildcard = a.includes("*");
  const bHasWildcard = b.includes("*");
  if (aHasWildcard && !bHasWildcard) return 1;
  if (!aHasWildcard && bHasWildcard) return -1;

  const aSpecificity = a.split("/").filter(Boolean).length;
  const bSpecificity = b.split("/").filter(Boolean).length;
  return bSpecificity - aSpecificity;
}

/**
 * Navigates to a new URL using the History API.
 * @param to The URL to navigate to.
 * @param options Navigation options.
 */
export function go(to: string, { replace = false }: { readonly replace?: boolean } = {}): void {
  const isHashMode = mode() === "hash";
  const finalTo = isHashMode ? `#${to}` : to;
  const action = replace ? "replaceState" : "pushState";

  hasWindow && window.history[action](null, "", finalTo);

  route({
    ...route(),
    path: to
  });
  updateRoute();
}

/**
 * Updates the current route based on the current URL.
 */
export function updateRoute() {
  const currentPath = route().path;

  const globalRedirects = redirects();

  // --- 1. Global redirects via globalRedirects (array) ---
  if (globalRedirects)
    for (const redirect of globalRedirects)
      if (redirect.from.includes(currentPath))
        return go(redirect.to, { replace: true });

  const routeMap = routes();
  if (!routeMap) return;

  // --- 2. Route map string redirects ---
  for (const [pattern, value] of Object.entries(routeMap))
    if (isString(value) && matchRoute(pattern, currentPath))
      return go(value, { replace: true });

  // --- 3. Nested route matching (prioritize nested routes) ---
  const routeEntries = Object.entries(routeMap)
    .filter(([_, value]) => !isString(value) && hasChildren(value))
    .sort(sortRoutesBySpecificity);

  for (const [pattern, routeValue] of routeEntries) {
    const nestedMatches = matchNestedRoute({ [pattern]: routeValue }, currentPath);

    if (nestedMatches && nestedMatches.length > 0) {
      const lastMatch = nestedMatches[nestedMatches.length - 1];
      const { params, query } = lastMatch;
      const handler = extractHandler(lastMatch.routeValue);
      const meta = extractMeta(lastMatch.routeValue);

      route({
        handler,
        params,
        query,
        path: currentPath,
        meta
      } as RouteInfo);

      executeRouteWithHooks(handler, params, query, routeValue, nestedMatches);
      return;
    }
  }

  // --- 4. Flat route matching (fallback) ---
  for (const pattern in routeMap) {
    const routeValue = routeMap[pattern];
    if (isString(routeValue)) continue;

    const match = matchRoute(pattern, currentPath);
    if (match) {
      const { params, query } = match;
      const handler = extractHandler(routeValue);
      const meta = extractMeta(routeValue);

      route({
        handler,
        params,
        query,
        path: currentPath,
        meta
      } as RouteInfo);
      executeRouteWithHooks(handler, params, query, routeValue);
      return;
    }
  }

  // --- 5. Not found ---
  const notFoundHandler = notFound();
  route({
    handler: notFoundHandler,
    params: EMPTY_OBJECT,
    query: EMPTY_OBJECT,
    path: currentPath,
    meta: undefined
  });

  notFoundHandler && notFoundHandler();
}

/**
 * Extracts handler function from a route value.
 * @param routeValue The route value to extract handler from
 * @returns The handler function or null if not found
 */
function extractHandler(routeValue: unknown): Handler | null {
  if (isFunction(routeValue))
    return routeValue as Handler;

  if (isRouteWithHooks(routeValue))
    return isFunction(routeValue.handler) ? routeValue.handler as Handler : null;

  return null;
}

/**
 * Extracts meta from a route value.
 * @param routeValue The route value to extract meta from
 * @returns The meta object or undefined if not found
 */
function extractMeta(routeValue: unknown): Record<string, unknown> | undefined {
  if (isPlainObject(routeValue))
    return (routeValue as RouteWithHooks).meta;
  return undefined;
}

/**
 * Extracts before and after hooks from a route value.
 * @param routeValue The route value to extract hooks from
 * @returns Object containing before and after hook functions
 */
function extractRouteHooks(routeValue: unknown): { before: Handler | null; after: Handler | null } {
  const isObj = isPlainObject(routeValue);
  return {
    before: isObj ? (routeValue as GlobalHooks).before || null : null,
    after: isObj ? (routeValue as GlobalHooks).after || null : null
  };
}

/**
 * Executes route handler and hooks in the correct order.
 * @param handler The main route handler
 * @param params Route parameters
 * @param query Query parameters
 * @param routeValue Optional route value for extracting hooks
 * @param nestedMatches Optional nested route matches for nested execution
 */
function executeRouteWithHooks(
  handler: Handler | null,
  params: Params,
  query: Params,
  routeValue?: unknown,
  nestedMatches?: RouteMatch[]
): void {
  const { before, after } = hooks();

  executeGlobalHook(before, "Global before");

  if (nestedMatches) {
    // Execute nested before hooks
    for (const { routeValue, params, query } of nestedMatches)
      executeHook(extractRouteHooks(routeValue).before, params, query, "Nested before");

    // Execute handler
    executeHook(handler, params, query, "Nested handler");

    let i = nestedMatches.length - 1;
    // Execute nested after hooks in reverse
    for (; i >= 0; i--) {
      const { routeValue, params, query } = nestedMatches[i];
      executeHook(extractRouteHooks(routeValue).after, params, query, "Nested after");
    }
  } else {
    // Flat route execution
    let { before, after } = extractRouteHooks(routeValue);

    executeHook(before, params, query, "hook");
    executeHook(handler, params, query, "handler");
    executeHook(after, params, query, "hook");
  }

  executeGlobalHook(after, "Global after");
}

