/**
 * Record type for route parameters and query strings.
 */
export type Params = Record<string, string>;

/**
 * Extracts route parameter names from a path pattern string.
 * @template T The path pattern string (e.g., '/users/:id')
 */
export type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractParams<Rest>]: string }
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : T extends `${string}*${infer Rest}`
        ? { [K in "*" | keyof ExtractParams<Rest>]: string }
        : {};

/**
 * Function type for route handlers and hooks. Declare the full
 * `(params, query)` signature; runtime dispatch is by the handler's own
 * arity (params present → fn(params, query); else fn.length >= 2 →
 * fn(undefined, query); else fn(query)).
 */
export type Handler = (params: Params, query: Params) => unknown;

/**
 * History mode for URL management. `"memory"` routes without a URL — no history
 * commits and no listeners; the route is driven by `navigate()` alone.
 */
export type HistoryMode = "history" | "hash" | "memory";

/**
 * Scroll behavior configuration.
 * - "auto": Browser default (no intervention)
 * - "top": Always scroll to top on navigation
 * - "preserve": Keep current scroll position
 * - Custom function returning scroll position or null to skip
 */
export type ScrollBehavior =
  | "auto"
  | "top"
  | "preserve"
  | ((to: string, from: string) => { top: number; left?: number } | null);

/**
 * Type-safe route map with string keys and route values.
 */
export interface Routes {
  [pattern: string]: RouteValue | string;
}

/**
 * Union type representing possible route values.
 */
export type RouteValue =
  | Handler
  | RouteWithHooks;

/**
 * Route definition with optional hooks and nested children.
 */
export interface RouteWithHooks {
  /** Main route handler function executed when route matches */
  handler?: Handler;
  /**
   * Hook executed before the main handler. Acts as a route guard (arity-dispatched: receives
   * cumulative params/query for this nesting level). Sync return contract: return `false` to
   * cancel (no URL/signal/handler change); return a non-empty `string` to redirect (replace) to
   * that path; any other return proceeds. Throwing cancels and logs `[router] hook:`. A returned
   * `Promise` does NOT block — the navigation proceeds immediately and only a rejection is logged.
   */
  before?: Handler;
  /** Hook executed after the main handler */
  after?: Handler;
  /** Arbitrary metadata attached to this route */
  meta?: Record<string, unknown>;
  /** Per-route override of the router's inheritMeta flag. True opts this route into the meta cascade; false opts out. */
  inheritMeta?: boolean;
  /** Scroll behavior override for this route, or false to disable */
  scroll?: ScrollBehavior | false;
  /** Nested child routes with inherited parameters */
  children?: Routes;
}

/**
 * Configuration object for router initialization.
 */
export interface RouterConfig {
  /** Map of route patterns to handlers or nested route objects */
  routes: Routes;
  /** Global hooks that execute on every route change */
  hooks?: GlobalHooks;
  /** Handler or redirect path for unmatched routes */
  notFound?: string | (() => void);
  /** Array of redirect rules mapping source paths to targets */
  redirects?: Redirect[];
  /** URL management mode: "history" for clean URLs, "hash" for `#/path` URLs, "memory" for location-less routing (no URL/history writes, no listeners — drive it with navigate()) */
  mode?: HistoryMode;
  /** Base path for apps deployed under a subpath (e.g. `"/app"` when served from `https://example.com/app/`). History mode only: stripped from the URL on every read and re-added on every history commit; hash mode ignores it. Route patterns, `navigate()` targets, and `route().path` stay base-free. Must be a `"/"`-prefixed string; trailing slashes are normalized away. */
  base?: string;
  /** Default scroll behavior applied to all routes unless overridden */
  scrollBehavior?: ScrollBehavior;
  /** Enable automatic interception of same-origin <a> link clicks for client-side navigation. Enabled by default. */
  intercept?: boolean;
  /** Enable parent-to-child meta inheritance through nested route chains. Child meta overrides parent on key conflict. Default is false (leaf-only meta). */
  inheritMeta?: boolean;
  /** Resolve against this URL instead of `window.location`. Accepts a full URL (e.g. `req.url`, like `https://host/users/7?q=1`) or a path (`/users/7?q=1`) — the origin and hash fragment are ignored. Invalid URLs throw. Used for SSR, where there is no window. Resolution is synchronous either way. */
  url?: string;
}

/**
 * Global hooks that execute on every route change.
 */
export interface GlobalHooks {
  /**
   * Hook executed before every route change. Acts as a global guard. Receives `to` (the incoming
   * path, query included — same shape as `route().path`) and `from` (the pre-commit current path,
   * matching the route-level `before` rule that `route()` still holds the previous route). Sync
   * return contract: return `false` to cancel (no URL/signal/handler change); return a non-empty
   * `string` to redirect (replace) to that path; any other return proceeds. Throwing cancels and
   * logs `[router] Global before:`. A returned `Promise` does NOT block — the navigation proceeds
   * immediately and only a rejection is logged. Decide synchronously to block.
   */
  before?: (to: string, from: string) => Promise<unknown> | unknown;
  /**
   * Hook executed after every route change. Receives `to` and `from` paths (query included) —
   * `route()` already holds the committed `to` route when it runs, so `from` supplies the prior
   * path without capturing it yourself.
   */
  after?: (to: string, from: string) => Promise<unknown> | unknown;
}

/**
 * Options for programmatic navigation.
 */
export interface NavigateOptions<T extends string = string> {
  /** Route parameters to substitute into the path pattern */
  params?: ExtractParams<T>;
  /** Query parameters to append to the URL */
  query?: Params;
  /** Replace the current history entry instead of pushing a new one */
  replace?: boolean;
  /** Scroll behavior override for this navigation */
  scroll?: ScrollBehavior | false;
  /** Arbitrary metadata attached to this navigation */
  meta?: Record<string, unknown>;
}

/**
 * Redirect configuration mapping source paths to target path.
 */
export interface Redirect {
  /** Array of source paths that trigger this redirect */
  readonly from: readonly string[];
  /** Target path to redirect to */
  readonly to: string;
}

/**
 * Current route state information.
 */
export interface RouteInfo {
  /** Matched route handler function, or null if no match */
  handler: Handler | null;
  /** Parameters extracted from the URL path */
  params: Params;
  /** Query parameters from the URL search string */
  query: Params;
  /** Current URL path */
  path: string;
  /** Route-specific metadata from the matched route */
  meta?: Record<string, unknown>;
  /** Parent-to-leaf chain of matched route breadcrumbs */
  crumbs: ReadonlyArray<Crumb>;
  /** Tests whether a pattern matches the current route path (ancestor semantics) */
  active: (pattern: string) => boolean;
}

/**
 * Breadcrumb entry for one level of the matched route chain.
 */
export interface Crumb {
  /** Route-map key that matched at this nesting level */
  readonly segment: string;
  /** Cumulative matched URL up to and including this level */
  readonly path: string;
  /** Inherited parameters through this level */
  readonly params: Params;
}

