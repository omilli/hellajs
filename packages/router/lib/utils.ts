import type { RouteValue, NestedRouteValue, NestedRouteMatch, HandlerWithParams, HandlerWithoutParams } from "./types";
import { hooks, route, routes, notFound, redirects } from "./state";

// Frozen empty objects to reduce memory allocations
const EMPTY_PARAMS = Object.freeze({}) as Record<string, string>;
const EMPTY_QUERY = Object.freeze({}) as Record<string, string>;

// Export for use in router.ts
export { EMPTY_PARAMS, EMPTY_QUERY };

/**
 * Navigates to a new URL using the History API.
 * @param to The URL to navigate to.
 * @param options Navigation options.
 */
export function go(to: string, { replace = false }: { replace?: boolean } = {}) {
  if (typeof window !== "undefined") {
    if (replace) {
      window.history.replaceState(null, "", to);
    } else {
      window.history.pushState(null, "", to);
    }
  }
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
  // Always use hash path if present, otherwise use route().path
  let run = route().path;
  if (typeof window !== "undefined" && window.location.hash) {
    run = getHashPath();
  }

  const globalRedirects = redirects();

  // --- 1. Global redirects via globalRedirects (array) ---
  if (globalRedirects) {
    for (const redirect of globalRedirects) {
      if (redirect.from.includes(run)) {
        go(redirect.to, { replace: true });
        return;
      }
    }
  }

  const routeMap = routes();
  // --- 2. Route map string redirects ---
  for (const pattern in routeMap) {
    const value = routeMap[pattern];
    if (typeof value === "string") {
      const match = matchRoute(pattern, run);
      if (match) {
        go(value, { replace: true });
        return;
      }
    }
  }

  // --- 3. Nested route matching (prioritize nested routes) ---
  // First pass: try nested route matching for all routes with children
  // Sort routes to prioritize more specific routes over wildcards
  const routeEntries = Object.entries(routeMap)
    .filter(([_, value]) => typeof value !== "string" && hasChildren(value))
    .sort(([a], [b]) => {
      // Prioritize routes without wildcards over routes with wildcards
      const aHasWildcard = a.includes("*");
      const bHasWildcard = b.includes("*");
      if (aHasWildcard && !bHasWildcard) return 1;
      if (!aHasWildcard && bHasWildcard) return -1;
      
      // Prioritize longer, more specific routes
      const aSpecificity = a.split("/").length;
      const bSpecificity = b.split("/").length;
      return bSpecificity - aSpecificity;
    });

  for (const [pattern, routeValue] of routeEntries) {
    const nestedMatches = matchNestedRoute({ [pattern]: routeValue }, run);
    if (nestedMatches && nestedMatches.length > 0) {
      const finalMatch = nestedMatches[nestedMatches.length - 1];
      const handler = typeof finalMatch.routeValue === "function"
        ? finalMatch.routeValue
        : (typeof finalMatch.routeValue === "object" && "handler" in finalMatch.routeValue)
          ? finalMatch.routeValue.handler || null
          : null;
      
      route({
        handler,
        params: finalMatch.params,
        query: finalMatch.query,
        path: run
      });
      callWithNestedHooks(nestedMatches);
      return;
    }
  }

  // --- 4. Flat route matching (fallback) ---
  // Second pass: try flat route matching only if nested routes didn't match
  for (const pattern in routeMap) {
    const routeValue = routeMap[pattern];
    if (typeof routeValue === "string") continue;
    
    const match = matchRoute(pattern, run);
    if (match) {
      const handler =
        typeof routeValue === "function"
          ? routeValue
          : routeValue && typeof routeValue === "object" && "handler" in routeValue
            ? routeValue.handler
            : null;
      const params = match.params;
      const query = match.query;
      route({
        handler,
        params,
        query,
        path: run
      });
      callWithHooks(routeValue as RouteValue<string>, params, query);
      return;
    }
  }

  // --- 5. Not found ---
  const notFoundHandler = notFound();
  route({
    handler: notFoundHandler,
    params: EMPTY_PARAMS,
    query: EMPTY_QUERY,
    path: run
  });
  if (notFoundHandler) {
    notFoundHandler();
  }
}

/**
 * Gets the path from the URL hash.
 * @returns The hash path.
 */
export function getHashPath() {
  if (typeof window === "undefined") return "/";
  const hash = window.location.hash || "";
  let path = hash.replace(/^#/, "");
  if (!path.startsWith("/")) path = "/" + path;
  return path;
}

/**
 * Sets the URL hash path.
 * @param path The path to set.
 * @param options Options for setting the hash.
 */
export function setHashPath(path: string, { replace = false }: { replace?: boolean } = {}) {
  if (typeof window === "undefined") return;
  const hash = `#${path.startsWith("/") ? path : "/" + path}`;
  if (replace) {
    window.location.replace(window.location.pathname + window.location.search + hash);
  } else {
    window.location.hash = hash;
  }
}

/**
 * Checks if a route value has nested children.
 */
function hasChildren(routeValue: RouteValue<string> | NestedRouteValue<string>): routeValue is NestedRouteValue<string> & { children: Record<string, unknown> } {
  return typeof routeValue === "object" && "children" in routeValue && !!routeValue.children;
}

/**
 * Matches a nested route structure against a path, returning the best match.
 * @param routeMap The nested route map to match against.
 * @param path The path to match.
 * @returns Array of matched route segments with their contexts, or null if no match.
 */
function matchNestedRoute(
  routeMap: Record<string, RouteValue<string> | NestedRouteValue<string> | string>,
  path: string
): NestedRouteMatch[] | null {
  const [pathWithoutQuery, actualQuery] = path.split("?");
  const query = parseQuery(actualQuery || "");
  
  // Sort routes by specificity: more specific routes first, wildcards last
  const routeEntries = Object.entries(routeMap)
    .filter(([_, value]) => typeof value !== "string") // Skip redirects
    .sort(([a], [b]) => {
      // Prioritize routes without wildcards over routes with wildcards
      const aHasWildcard = a.includes("*");
      const bHasWildcard = b.includes("*");
      if (aHasWildcard && !bHasWildcard) return 1;
      if (!aHasWildcard && bHasWildcard) return -1;
      
      // Prioritize longer, more specific routes
      const aSpecificity = a.split("/").filter(Boolean).length;
      const bSpecificity = b.split("/").filter(Boolean).length;
      return bSpecificity - aSpecificity;
    });
  
  for (const [pattern, routeValue] of routeEntries) {
    
    const match = matchRouteSegment(pattern, pathWithoutQuery);
    if (match) {
      const currentMatch: NestedRouteMatch = {
        routeValue: routeValue as NestedRouteValue<string>,
        params: match.params,
        query: query,
        remainingPath: match.remainingPath,
        fullPath: path
      };
      
      // If we have children and remaining path, try to match children
      const nonStringRouteValue = routeValue as NestedRouteValue<string>;
      if (hasChildren(nonStringRouteValue) && match.remainingPath) {
        const childMatches = matchNestedRoute(
          nonStringRouteValue.children as Record<string, RouteValue<string> | NestedRouteValue<string> | string>, 
          match.remainingPath + (actualQuery ? "?" + actualQuery : "")
        );
        if (childMatches) {
          // Merge parent parameters into child matches
          for (const childMatch of childMatches) {
            childMatch.params = { ...match.params, ...childMatch.params };
          }
          // Return parent + children matches
          const result = [currentMatch, ...childMatches];
          return result;
        }
        // If children didn't match, check if parent has a handler to fall back to
        const hasHandler = typeof routeValue === "function" || 
          (typeof routeValue === "object" && "handler" in routeValue && routeValue.handler);
        return hasHandler ? [currentMatch] : null;
      }
      
      // If no children or no remaining path, this is a valid leaf match
      return [currentMatch];
    }
  }
  
  return null;
}

/**
 * Matches a single route segment against a path.
 * @param routePattern The pattern to match.
 * @param path The path to match against.
 * @returns The matched parameters and remaining path, or null if no match.
 */
function matchRouteSegment(routePattern: string, path: string): { 
  params: Record<string, string>; 
  remainingPath: string 
} | null {
  const patternPath = routePattern.split("?")[0];
  const actualPath = path.split("?")[0];
  const patternParts = patternPath.split("/").filter(Boolean);
  const pathParts = actualPath.split("/").filter(Boolean);

  const hasWildcard = patternParts[patternParts.length - 1] === "*";
  const baseLength = hasWildcard ? patternParts.length - 1 : patternParts.length;

  // For nested routes, we allow partial matches if there are more path segments
  if (!hasWildcard && patternParts.length > pathParts.length) return null;
  if (hasWildcard && pathParts.length < baseLength) return null;

  let params: Record<string, string> = EMPTY_PARAMS;
  let hasParams = false;

  for (let i = 0; i < baseLength; i++) {
    const p = patternParts[i];
    const v = pathParts[i];
    if (p.startsWith(":")) {
      if (!hasParams) {
        params = {}; // Create new object only when we have parameters
        hasParams = true;
      }
      params[p.slice(1)] = v;
    } else if (p !== v) {
      return null;
    }
  }

  let remainingPath = "";
  if (hasWildcard) {
    if (!hasParams) {
      params = {}; // Create new object only when we have parameters
      hasParams = true;
    }
    params["*"] = pathParts.slice(baseLength).join("/");
  } else {
    // Calculate remaining path for potential child routes
    const consumedParts = baseLength;
    if (pathParts.length > consumedParts) {
      remainingPath = "/" + pathParts.slice(consumedParts).join("/");
    }
  }

  return { params, remainingPath };
}

/**
 * Matches a route pattern against a path.
 * @param routePattern The pattern to match.
 * @param path The path to match against.
 * @returns The matched parameters and query, or null if no match.
 */
function matchRoute(routePattern: string, path: string): { params: Record<string, string>; query: Record<string, string> } | null {
  const [patternPath] = routePattern.split("?");
  const [actualPath, actualQuery] = path.split("?");
  const patternParts = patternPath.split("/").filter(Boolean);
  const pathParts = actualPath.split("/").filter(Boolean);

  const hasWildcard = patternParts[patternParts.length - 1] === "*";
  const baseLength = hasWildcard ? patternParts.length - 1 : patternParts.length;

  if (!hasWildcard && patternParts.length > pathParts.length) return null;
  if (!hasWildcard && pathParts.length > patternParts.length) return null;
  if (hasWildcard && pathParts.length < baseLength) return null;

  let params: Record<string, string> = EMPTY_PARAMS;
  let hasParams = false;

  for (let i = 0; i < baseLength; i++) {
    const p = patternParts[i];
    const v = pathParts[i];
    if (p.startsWith(":")) {
      if (!hasParams) {
        params = {}; // Create new object only when we have parameters
        hasParams = true;
      }
      params[p.slice(1)] = v;
    } else if (p !== v) {
      return null;
    }
  }

  if (hasWildcard) {
    if (!hasParams) {
      params = {}; // Create new object only when we have parameters
      hasParams = true;
    }
    params["*"] = pathParts.slice(baseLength).join("/");
  }

  const query = parseQuery(actualQuery || "");
  return { params, query };
}

/**
 * Parses a query string into an object.
 * @param query The query string to parse.
 * @returns The parsed query object.
 */
function parseQuery(query: string): Record<string, string> {
  if (!query) return EMPTY_QUERY;
  const params: Record<string, string> = {};
  for (const part of query.replace(/^\?/, "").split("&")) {
    if (!part) continue;
    const [k, v] = part.split("=");
    params[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return params;
}

/**
 * Calls a route handler with the appropriate hooks.
 * @param routeValue The route value object.
 * @param params The route parameters.
 * @param query The query parameters.
 * @returns The result of the route handler.
 */
/**
 * Helper function to handle both synchronous and asynchronous hooks.
 * If a hook returns a promise, it will be handled asynchronously without blocking.
 */
function handleHook(hookResult: unknown): void {
  if (hookResult && typeof hookResult === "object" && "then" in hookResult) {
    // Handle promise asynchronously without blocking
    (hookResult as Promise<unknown>).catch(console.error);
  }
}

function callWithHooks(
  routeValue: RouteValue<string> | undefined,
  params: Record<string, string>,
  query: Record<string, string> = {}
) {
  const globalHooks = hooks();
  if (globalHooks.before) {
    const beforeResult = globalHooks.before();
    handleHook(beforeResult);
  }

  const isObj = typeof routeValue === "object" && "handler" in routeValue;
  const handler = isObj ? routeValue.handler : routeValue;
  const before = isObj && routeValue.before;
  const after = isObj && routeValue.after;

  const hasParams = Object.keys(params).length > 0;

  function call(fn: unknown) {
    if (!fn) return;
    let hookResult;
    if (hasParams) {
      hookResult = (fn as HandlerWithParams)(params, query);
    } else {
      if (typeof fn === "function" && fn.length >= 2) {
        hookResult = (fn as HandlerWithParams)(undefined as any, query);
      } else {
        hookResult = (fn as HandlerWithoutParams)(query);
      }
    }
    handleHook(hookResult);
  }

  call(before);
  let result;
  if (handler) {
    if (hasParams) {
      result = (handler as HandlerWithParams)(params, query);
    } else if (typeof handler === "function" && handler.length >= 2) {
      result = (handler as HandlerWithParams)(undefined as any, query);
    } else {
      result = (handler as HandlerWithoutParams)(query);
    }
  }
  call(after);

  if (globalHooks.after) {
    const afterResult = globalHooks.after();
    handleHook(afterResult);
  }

  return result;
}

/**
 * Calls nested route handlers with proper hook inheritance.
 * Only the final (leaf) handler is executed, but all before/after hooks run in proper order.
 * @param matches Array of nested route matches from parent to child.
 * @returns The result of the final child handler.
 */
function callWithNestedHooks(matches: NestedRouteMatch[]) {
  const globalHooks = hooks();
  if (globalHooks.before) {
    const beforeResult = globalHooks.before();
    handleHook(beforeResult);
  }

  let result;

  // Execute before hooks in parent-to-child order
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const routeValue = match.routeValue;
    const params = match.params;
    const query = match.query;

    const isObj = typeof routeValue === "object";
    const before = isObj && "before" in routeValue ? routeValue.before : null;
    const hasParams = Object.keys(params).length > 0;

    // Call before hook for this level
    if (before) {
      let hookResult;
      if (hasParams) {
        hookResult = (before as HandlerWithParams)(params, query);
      } else {
        if (typeof before === "function" && before.length >= 2) {
          hookResult = (before as HandlerWithParams)(undefined as any, query);
        } else {
          hookResult = (before as HandlerWithoutParams)(query);
        }
      }
      handleHook(hookResult);
    }
  }

  // Execute only the final (leaf) handler
  const finalMatch = matches[matches.length - 1];
  const finalRouteValue = finalMatch.routeValue;
  const finalParams = finalMatch.params;
  const finalQuery = finalMatch.query;
  const finalHasParams = Object.keys(finalParams).length > 0;

  const isObj = typeof finalRouteValue === "object" && "handler" in finalRouteValue;
  const handler = typeof finalRouteValue === "function" 
    ? finalRouteValue 
    : (isObj ? finalRouteValue.handler || null : null);

  if (handler) {
    if (finalHasParams) {
      result = (handler as HandlerWithParams)(finalParams, finalQuery);
    } else if (typeof handler === "function" && handler.length >= 2) {
      result = (handler as HandlerWithParams)(undefined as any, finalQuery);
    } else {
      result = (handler as HandlerWithoutParams)(finalQuery);
    }
  }

  // Execute after hooks in child-to-parent order (reverse)
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const routeValue = match.routeValue;
    const params = match.params;
    const query = match.query;

    const isObj = typeof routeValue === "object";
    const after = isObj && "after" in routeValue ? routeValue.after : null;
    const hasParams = Object.keys(params).length > 0;

    if (after) {
      let hookResult;
      if (hasParams) {
        hookResult = (after as HandlerWithParams)(params, query);
      } else {
        if (typeof after === "function" && after.length >= 2) {
          hookResult = (after as HandlerWithParams)(undefined as any, query);
        } else {
          hookResult = (after as HandlerWithoutParams)(query);
        }
      }
      handleHook(hookResult);
    }
  }

  if (globalHooks.after) {
    const afterResult = globalHooks.after();
    handleHook(afterResult);
  }

  return result;
}