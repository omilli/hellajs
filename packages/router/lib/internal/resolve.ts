import { isString, hasWindow } from "./core";
import { routes, notFound, redirects, inheritMeta, mode, base } from "./state";
import { route, activeFn } from "../route";
import { matchRoute, matchNestedEntry } from "./match";
import type { RouteMatch } from "./match";
import { handleScroll, extractHandler, extractMeta, extractInheritMeta, extractScroll, executeRouteWithHooks, runGuardsFlat, runGuardsNested, type GuardVerdict } from "./matched";
import { EMPTY_OBJECT, EMPTY_CRUMBS, hasChildren, sortRoutesBySpecificity } from "./utils";
import type { RouteValue, Crumb, ScrollBehavior, Handler, Params, RouteInfo } from "../types";

/**
 * Resolution verdict propagated up from `tryMatchRoute`/`updateRoute` to `go` and the popstate handler.
 * `"matched"` commits the navigation (signal written, history updated); `"cancelled"` means a guard
 * blocked (no signal write, no history change from this call); `"redirected"` means a guard or
 * redirect rule issued a nested `go` that handled history itself.
 */
type RouteVerdict = "matched" | "cancelled" | "redirected";

/** Caps synchronous re-entrant resolutions so cyclic redirect/guard configs cancel instead of overflowing the stack. */
const MAX_REDIRECT_HOPS = 20;
let resolveDepth = 0;

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
 * Resolves the current URL through redirects, route matching (running guards), and notFound.
 * @internal
 * @param nextPath Optional new path. When omitted, reads from route().path.
 * @param inlineScroll Optional inline scroll behavior from navigate()
 * @param inlineMeta Optional inline meta from navigate()
 * @returns The resolution verdict: `"matched"`, `"cancelled"` (a guard blocked), or `"redirected".
 */
export function updateRoute(
  nextPath?: string,
  inlineScroll?: ScrollBehavior | false,
  inlineMeta?: Record<string, unknown>
): RouteVerdict {
  if (resolveDepth >= MAX_REDIRECT_HOPS) {
    console.error("[router] redirect loop detected:", new Error(`exceeded ${MAX_REDIRECT_HOPS} hops resolving ${nextPath ?? route().path}`));
    return "cancelled";
  }
  resolveDepth++;
  try {
    const currentPath = nextPath ?? route().path;

    if (tryRedirect(currentPath)) {
      return "redirected";
    }

    const matchVerdict = tryMatchRoute(currentPath, inlineScroll, inlineMeta);
    if (matchVerdict !== "none") {
      return matchVerdict;
    }

    const notFoundValue = notFound();

    if (isString(notFoundValue)) {
      go(notFoundValue, { replace: true });
      return "redirected";
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
    return "matched";
  } finally {
    resolveDepth--;
  }
}

/**
 * Resolves a URL through the route pipeline and, only on a committed match (guards passed),
 * updates the browser history. A cancelled guard produces no history change; a redirect's nested
 * `go` already updated history, so the outer call skips. Memory mode performs no history commit.
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
  const routerMode = mode();
  const finalTo = routerMode === "hash" ? `#${to}` : base() + to;
  const action = replace ? "replaceState" : "pushState";

  const verdict = updateRoute(to, scroll, meta);

  if (verdict === "matched" && hasWindow() && routerMode !== "memory") {
    window.history[action](null, "", finalTo);
  }
}

/**
 * Merges inline navigate() meta over the resolved route meta.
 * @param inlineMeta Inline meta from navigate(), or undefined.
 * @param routeMeta Meta resolved from the matched route chain, or undefined.
 * @returns The merged meta object or undefined.
 */
function mergeRouteMeta(inlineMeta: Record<string, unknown> | undefined, routeMeta?: Record<string, unknown>): Record<string, unknown> | undefined {
  return inlineMeta !== undefined ? { ...routeMeta, ...inlineMeta } : routeMeta;
}

/**
 * Shared post-match pipeline for both matching phases: maps the guard verdict (cancel/redirect)
 * and, only on a pass, commits the match — route signal write, handler + after-hooks, scroll.
 * @param guardVerdict Verdict from the phase's guard chain.
 * @param handler Extracted handler (or null).
 * @param params Matched parameters.
 * @param query Parsed query.
 * @param meta Final merged meta.
 * @param crumbs Frozen crumb chain.
 * @param currentPath The resolved URL path.
 * @param inlineScroll Inline scroll override from navigate().
 * @param routeScroll Route-level scroll override.
 * @param routeValue The matched route value (flat) or top-level candidate (nested), forwarded to hook execution.
 * @param nestedMatches Parent-to-leaf match chain for nested routes; absent for flat routes.
 * @returns The resolution verdict: `"matched"`, `"cancelled"`, or `"redirected"`.
 */
function commitMatch(
  guardVerdict: GuardVerdict,
  handler: Handler | null,
  params: Params,
  query: Params,
  meta: Record<string, unknown> | undefined,
  crumbs: ReadonlyArray<Crumb>,
  currentPath: string,
  inlineScroll: ScrollBehavior | false | undefined,
  routeScroll: ScrollBehavior | false | undefined,
  routeValue: unknown,
  nestedMatches?: RouteMatch[]
): RouteVerdict {
  if (guardVerdict === "cancel") {
    return "cancelled";
  }
  if (guardVerdict !== "pass") {
    go(guardVerdict.redirect, { replace: true });
    return "redirected";
  }

  const fromPath = route().path;
  route(buildRouteInfo({
    handler,
    params,
    query,
    path: currentPath,
    meta,
    crumbs
  }));
  executeRouteWithHooks(handler, params, query, currentPath, fromPath, routeValue, nestedMatches);
  handleScroll(currentPath, inlineScroll, routeScroll);
  return "matched";
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
 * Attempts nested route matching, running guards before the route signal is written.
 * @param routeMap The route map to match against.
 * @param currentPath The current URL path.
 * @param inlineScroll Optional inline scroll behavior from navigate().
 * @param inlineMeta Optional inline meta from navigate().
 * @returns `"matched"` (guards passed, signal written), `"cancelled"` (a guard blocked),
 * `"redirected"` (a guard redirected via a nested `go`), or `"none"` (no nested route matched).
 */
function matchNestedPhase(
  routeMap: Record<string, RouteValue | string>,
  currentPath: string,
  inlineScroll: ScrollBehavior | false | undefined,
  inlineMeta: Record<string, unknown> | undefined
): "none" | RouteVerdict {
  const pathWithoutQuery = currentPath.split("?")[0]!;

  const routeEntries = Object.entries(routeMap)
    .filter(([, value]) => !isString(value) && hasChildren(value))
    .sort(sortRoutesBySpecificity);

  let i = 0;
  const len = routeEntries.length;
  while (i < len) {
    const [pattern, routeValue] = routeEntries[i]!;
    i++;

    const nestedMatches = matchNestedEntry(pattern, routeValue, currentPath);

    if (nestedMatches && nestedMatches.length > 0) {
      const lastMatch = nestedMatches[nestedMatches.length - 1]!;
      const { params, query } = lastMatch;

      const guardVerdict = runGuardsNested(nestedMatches, currentPath);

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

      return commitMatch(
        guardVerdict,
        extractHandler(lastMatch.routeValue),
        params,
        query,
        mergeRouteMeta(inlineMeta, routeMeta),
        Object.freeze(crumbs),
        currentPath,
        inlineScroll,
        extractScroll(lastMatch.routeValue),
        routeValue,
        nestedMatches
      );
    }
  }

  return "none";
}

/**
 * Attempts flat route matching, running guards before the route signal is written.
 * @param routeMap The route map to match against.
 * @param currentPath The current URL path.
 * @param inlineScroll Optional inline scroll behavior from navigate().
 * @param inlineMeta Optional inline meta from navigate().
 * @returns `"matched"` (guards passed, signal written), `"cancelled"` (a guard blocked),
 * `"redirected"` (a guard redirected via a nested `go`), or `"none"` (no flat route matched).
 */
function matchFlatPhase(
  routeMap: Record<string, RouteValue | string>,
  currentPath: string,
  inlineScroll: ScrollBehavior | false | undefined,
  inlineMeta: Record<string, unknown> | undefined
): "none" | RouteVerdict {
  const pathWithoutQuery = currentPath.split("?")[0]!;

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
      const guardVerdict = runGuardsFlat(routeValue, params, query, currentPath);

      return commitMatch(
        guardVerdict,
        extractHandler(routeValue),
        params,
        query,
        mergeRouteMeta(inlineMeta, extractMeta(routeValue)),
        Object.freeze([{ segment: pattern, path: pathWithoutQuery, params }]),
        currentPath,
        inlineScroll,
        extractScroll(routeValue),
        routeValue
      );
    }
  }
  return "none";
}

/**
 * Attempts nested then flat route matching, running guards before the route signal is written.
 * @param currentPath The current URL path.
 * @param inlineScroll Optional inline scroll behavior from navigate().
 * @param inlineMeta Optional inline meta from navigate().
 * @returns `"matched"` (guards passed, signal written), `"cancelled"` (a guard blocked),
 * `"redirected"` (a guard redirected via a nested `go`), or `"none"` (no route matched).
 */
function tryMatchRoute(
  currentPath: string,
  inlineScroll: ScrollBehavior | false | undefined,
  inlineMeta: Record<string, unknown> | undefined
): "none" | RouteVerdict {
  const routeMap = routes();
  if (!routeMap) {
    return "none";
  }

  const nestedVerdict = matchNestedPhase(routeMap, currentPath, inlineScroll, inlineMeta);
  if (nestedVerdict !== "none") {
    return nestedVerdict;
  }

  return matchFlatPhase(routeMap, currentPath, inlineScroll, inlineMeta);
}
