import { isPlainObject, isString, hasWindow } from "./internal/core";
import { route, routes, notFound, redirects, mode, inheritMeta, activeFn } from "./state";
import { matchRoute, matchNestedRoute } from "./match";
import { handleScroll, extractHandler, extractMeta, extractInheritMeta, extractScroll, executeRouteWithHooks } from "./internal/matched";
import type {
  RouteInfo,
  RouteWithHooks,
  RouteValue,
  Crumb,
  Handler,
  Params,
  ScrollBehavior
} from "./types";

/**
 * Frozen empty parameters object for memory efficiency.
 * @internal
 */
export const EMPTY_OBJECT = Object.freeze({}) as Params;

/**
 * Frozen empty crumbs array for memory efficiency.
 * @internal
 */
export const EMPTY_CRUMBS: ReadonlyArray<Crumb> = Object.freeze([]);

/**
 * Constructs RouteInfo with the shared active-link predicate attached.
 * @param base Route fields excluding active.
 * @returns Complete RouteInfo with the active predicate.
 */
function buildRouteInfo(base: {
  handler: Handler | null;
  params: Params;
  query: Params;
  path: string;
  meta?: Record<string, unknown>;
  crumbs: ReadonlyArray<Crumb>;
}): RouteInfo {
  return { ...base, active: activeFn };
}

/**
 * Checks if a route value has nested children.
 * @internal
 * @param routeValue The route value to check.
 * @returns True if the route has children.
 */
export const hasChildren = (routeValue: RouteValue): routeValue is RouteWithHooks =>
  isPlainObject(routeValue) && !!(routeValue as RouteWithHooks).children;

/**
 * Extracts the path from the hash portion of the URL.
 * @internal
 * @returns The path from hash (without #), or "/" if empty.
 */
export function getHashPath(): string {
  const hash = window.location.hash;
  return hash ? hash.slice(1) : "/";
}

/**
 * Sorts routes by specificity for proper matching precedence.
 * @internal
 * @param a First route entry.
 * @param b Second route entry.
 * @returns Sort comparison result.
 */
export function sortRoutesBySpecificity([patternA]: [string, unknown], [patternB]: [string, unknown]): number {
  const aHasWildcard = patternA.includes("*");
  const bHasWildcard = patternB.includes("*");
  if (aHasWildcard && !bHasWildcard) {
    return 1;
  }
  if (!aHasWildcard && bHasWildcard) {
    return -1;
  }

  const aSpecificity = patternA.split("/").filter(Boolean).length;
  const bSpecificity = patternB.split("/").filter(Boolean).length;
  return bSpecificity - aSpecificity;
}

/**
 * Navigates to a new URL using the History API.
 * @internal
 * @param to The URL to navigate to.
 * @param options Navigation options including replace, scroll, and meta.
 */
export function go(
  to: string,
  options: {
    readonly replace?: boolean;
    scroll?: ScrollBehavior | false;
    meta?: Record<string, unknown>;
  } = {}
): void {
  const { replace = false, scroll, meta } = options;
  const isHashMode = mode() === "hash";
  const finalTo = isHashMode ? `#${to}` : to;
  const action = replace ? "replaceState" : "pushState";

  hasWindow() && window.history[action](null, "", finalTo);

  updateRoute(to, scroll, meta);
}

/**
 * Updates the current route based on the current URL.
 * @internal
 * @param nextPath Optional new path. When omitted, reads from route().path.
 * @param inlineScroll Optional inline scroll behavior from navigate()
 * @param inlineMeta Optional inline meta from navigate()
 */
export function updateRoute(
  nextPath?: string,
  inlineScroll?: ScrollBehavior | false,
  inlineMeta?: Record<string, unknown>
) {
  const currentPath = nextPath ?? route().path;

  if (tryRedirect(currentPath)) {
    return;
  }

  if (tryMatchRoute(currentPath, inlineScroll, inlineMeta)) {
    return;
  }

  const notFoundValue = notFound();

  if (isString(notFoundValue)) {
    return go(notFoundValue, { replace: true });
  }

  route(buildRouteInfo({
    handler: notFoundValue,
    params: EMPTY_OBJECT,
    query: EMPTY_OBJECT,
    path: currentPath,
    meta: inlineMeta,
    crumbs: EMPTY_CRUMBS
  }));

  notFoundValue && notFoundValue();
  handleScroll(currentPath, inlineScroll);
}

/**
 * Attempts global and string redirects.
 * @param currentPath The current URL path.
 * @returns True if a redirect was issued.
 */
function tryRedirect(currentPath: string): boolean {
  const globalRedirects = redirects();

  if (globalRedirects) {
    const pathWithoutQuery = currentPath.split("?")[0]!;
    let i = 0;
    const len = globalRedirects.length;
    while (i < len) {
      const redirect = globalRedirects[i]!;
      i++;
      if (redirect.from.includes(pathWithoutQuery)) {
        go(redirect.to, { replace: true });
        return true;
      }
    }
  }

  const routeMap = routes();
  if (!routeMap) {
    return false;
  }

  {
    const entries = Object.entries(routeMap);
    let i = 0;
    const len = entries.length;
    while (i < len) {
      const [pattern, value] = entries[i]!;
      i++;
      if (isString(value) && matchRoute(pattern, currentPath)) {
        go(value, { replace: true });
        return true;
      }
    }
  }

  return false;
}

/**
 * Attempts nested and flat route matching.
 * @param currentPath The current URL path.
 * @param inlineScroll Optional inline scroll behavior from navigate().
 * @param inlineMeta Optional inline meta from navigate().
 * @returns True if a route matched and was executed.
 */
function tryMatchRoute(
  currentPath: string,
  inlineScroll: ScrollBehavior | false | undefined,
  inlineMeta: Record<string, unknown> | undefined
): boolean {
  const routeMap = routes();
  if (!routeMap) {
    return false;
  }

  const pathWithoutQuery = currentPath.split("?")[0]!;

  const mergeMeta = (routeMeta?: Record<string, unknown>) =>
    inlineMeta !== undefined ? { ...routeMeta, ...inlineMeta } : routeMeta;

  {
    const routeEntries = Object.entries(routeMap)
      .filter(([, value]) => !isString(value) && hasChildren(value))
      .sort(sortRoutesBySpecificity);

    let i = 0;
    const len = routeEntries.length;
    while (i < len) {
      const [pattern, routeValue] = routeEntries[i]!;
      i++;

      const nestedMatches = matchNestedRoute({ [pattern]: routeValue }, currentPath);

      if (nestedMatches && nestedMatches.length > 0) {
        const lastMatch = nestedMatches[nestedMatches.length - 1]!;
        const { params, query } = lastMatch;
        const handler = extractHandler(lastMatch.routeValue);

        let routeMeta: Record<string, unknown> | undefined;
        {
          let j = 0;
          const jLen = nestedMatches.length;
          while (j < jLen) {
            const match = nestedMatches[j]!;
            const segmentMeta = extractMeta(match.routeValue);
            if (j === 0) {
              routeMeta = segmentMeta;
            } else if (extractInheritMeta(match.routeValue) ?? inheritMeta()) {
              if (segmentMeta) routeMeta = { ...(routeMeta ?? {}), ...segmentMeta };
            } else {
              routeMeta = segmentMeta;
            }
            j++;
          }
        }
        const meta = mergeMeta(routeMeta);
        const scroll = extractScroll(lastMatch.routeValue);

        const mLen = nestedMatches.length;
        const crumbs = new Array<Crumb>(mLen);
        let mi = 0;
        while (mi < mLen) {
          const match = nestedMatches[mi]!;
          crumbs[mi] = {
            segment: match.pattern,
            path: pathWithoutQuery.slice(0, pathWithoutQuery.length - match.remainingPath.length),
            params: match.params
          };
          mi++;
        }

        route(buildRouteInfo({
          handler,
          params,
          query,
          path: currentPath,
          meta,
          crumbs: Object.freeze(crumbs)
        }));
        executeRouteWithHooks(handler, params, query, routeValue, nestedMatches);
        handleScroll(currentPath, inlineScroll, scroll);
        return true;
      }
    }
  }

  {
    const keys = Object.keys(routeMap);
    let i = 0;
    const len = keys.length;
    while (i < len) {
      const pattern = keys[i]!;
      i++;
      const routeValue = routeMap[pattern];
      if (isString(routeValue)) {
        continue;
      }
      const match = matchRoute(pattern, currentPath);
      if (match) {
        const { params, query } = match;
        const handler = extractHandler(routeValue);
        const meta = mergeMeta(extractMeta(routeValue));
        const scroll = extractScroll(routeValue);

        route(buildRouteInfo({
          handler,
          params,
          query,
          path: currentPath,
          meta,
          crumbs: Object.freeze([{ segment: pattern, path: pathWithoutQuery, params }])
        }));
        executeRouteWithHooks(handler, params, query, routeValue);
        handleScroll(currentPath, inlineScroll, scroll);
        return true;
      }
    }
  }
  return false;
}

