import type { RouteValue, HandlerWithParams, HandlerWithoutParams } from "./types";
import { hooks, route, routes } from "./state";

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

export function updateRoute() {
  // Always use hash path if present, otherwise use route().path
  let run = route().path;
  if (typeof window !== "undefined" && window.location.hash) {
    run = getHashPath();
  }

  const globalHooks = hooks();

  // --- 1. Global redirects via globalHooks (array) ---
  if (globalHooks.redirects) {
    for (const redirect of globalHooks.redirects) {
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

  // --- 3. Normal route matching ---
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
      callWithHooks(routeValue, params, query);
      return;
    }
  }

  // --- 4. Not found ---
  const notFoundActive = globalHooks["404"] ?? (() => { });
  route({
    handler: notFoundActive,
    params: {},
    query: {},
    path: run
  });
  if (notFoundActive) {
    notFoundActive();
  }
}

export function getHashPath() {
  if (typeof window === "undefined") return "/";
  const hash = window.location.hash || "";
  let path = hash.replace(/^#/, "");
  if (!path.startsWith("/")) path = "/" + path;
  return path;
}

export function setHashPath(path: string, { replace = false }: { replace?: boolean } = {}) {
  if (typeof window === "undefined") return;
  const hash = `#${path.startsWith("/") ? path : "/" + path}`;
  if (replace) {
    window.location.replace(window.location.pathname + window.location.search + hash);
  } else {
    window.location.hash = hash;
  }
}


function matchRoute(routePattern: string, path: string): { params: Record<string, string>; query: Record<string, string> } | null {
  const [patternPath] = routePattern.split("?");
  const [actualPath, actualQuery] = path.split("?");
  const patternParts = patternPath.split("/").filter(Boolean);
  const pathParts = actualPath.split("/").filter(Boolean);

  const params: Record<string, string> = {};

  const hasWildcard = patternParts[patternParts.length - 1] === "*";
  const baseLength = hasWildcard ? patternParts.length - 1 : patternParts.length;

  if (!hasWildcard && patternParts.length > pathParts.length) return null;
  if (!hasWildcard && pathParts.length > patternParts.length) return null;
  if (hasWildcard && pathParts.length < baseLength) return null;

  for (let i = 0; i < baseLength; i++) {
    const p = patternParts[i];
    const v = pathParts[i];
    if (p.startsWith(":")) {
      params[p.slice(1)] = v;
    } else if (p !== v) {
      return null;
    }
  }

  if (hasWildcard) {
    params["*"] = pathParts.slice(baseLength).join("/");
  }

  const query = parseQuery(actualQuery || "");
  return { params, query };
}

function parseQuery(query: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!query) return params;
  for (const part of query.replace(/^\?/, "").split("&")) {
    if (!part) continue;
    const [k, v] = part.split("=");
    params[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return params;
}

function callWithHooks(
  routeValue: RouteValue<string> | undefined,
  params: Record<string, string>,
  query: Record<string, string> = {}
) {
  const globalHooks = hooks();
  if (globalHooks.before) globalHooks.before();

  const isObj = typeof routeValue === "object" && "handler" in routeValue;
  const handler = isObj ? routeValue.handler : routeValue;
  const before = isObj && routeValue.before;
  const after = isObj && routeValue.after;

  const hasParams = Object.keys(params).length > 0;

  function call(fn: unknown) {
    if (!fn) return;
    if (hasParams) {
      (fn as HandlerWithParams)(params, query);
    } else {
      if (typeof fn === "function" && fn.length >= 2) {
        (fn as HandlerWithParams)(undefined as any, query);
      } else {
        (fn as HandlerWithoutParams)(query);
      }
    }
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

  if (globalHooks.after) globalHooks.after();

  return result;
}
