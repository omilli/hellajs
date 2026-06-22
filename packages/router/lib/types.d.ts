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
 * Generic function type for route handlers and hooks.
 */
export type Handler = (...args: never[]) => unknown;

/**
 * History mode for URL management.
 */
export type HistoryMode = "history" | "hash";

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
export type Routes = {
  [pattern: string]: RouteValue | string;
};

/**
 * Union type representing possible route values.
 */
export type RouteValue =
  | Handler
  | RouteWithHooks;

/**
 * Route definition with optional hooks and nested children.
 */
export type RouteWithHooks = {
  /** Main route handler function executed when route matches */
  handler?: Handler;
  /** Hook executed before the main handler */
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
};

/**
 * Configuration object for router initialization.
 */
export type RouterConfig = {
  /** Map of route patterns to handlers or nested route objects */
  routes: Routes;
  /** Global hooks that execute on every route change */
  hooks?: GlobalHooks;
  /** Handler or redirect path for unmatched routes */
  notFound?: string | (() => void);
  /** Array of redirect rules mapping source paths to targets */
  redirects?: Redirect[];
  /** URL management mode: "history" for clean URLs, "hash" for hash-based routing */
  mode?: HistoryMode;
  /** Default scroll behavior applied to all routes unless overridden */
  scrollBehavior?: ScrollBehavior;
  /** Enable automatic interception of same-origin <a> link clicks for client-side navigation. Enabled by default. */
  intercept?: boolean;
  /** Enable parent-to-child meta inheritance through nested route chains. Child meta overrides parent on key conflict. Default is false (leaf-only meta). */
  inheritMeta?: boolean;
};

/**
 * Global hooks that execute on every route change.
 */
export type GlobalHooks = {
  /** Hook executed before every route change */
  before?: () => Promise<unknown> | unknown;
  /** Hook executed after every route change */
  after?: () => Promise<unknown> | unknown;
};

/**
 * Options for programmatic navigation.
 */
export type NavigateOptions<T extends string = string> = {
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
};

/**
 * Redirect configuration mapping source paths to target path.
 */
export type Redirect = {
  /** Array of source paths that trigger this redirect */
  readonly from: readonly string[];
  /** Target path to redirect to */
  readonly to: string;
};

/**
 * Current route state information.
 */
export type RouteInfo = {
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
};

/**
 * Breadcrumb entry for one level of the matched route chain.
 */
export type Crumb = {
  /** Route-map key that matched at this nesting level */
  readonly segment: string;
  /** Cumulative matched URL up to and including this level */
  readonly path: string;
  /** Inherited parameters through this level */
  readonly params: Params;
};

/**
 * Internal route matching result with extracted parameters.
 */
export type RouteMatch = {
  /** Route value that was matched */
  routeValue: RouteValue;
  /** Pattern string that matched at this nesting level */
  pattern: string;
  /** Parameters extracted from the matched path */
  params: Params;
  /** Query parameters from the URL */
  query: Params;
  /** Remaining unmatched path segment for nested matching */
  remainingPath: string;
  /** Path input at this nesting level */
  fullPath: string;
  /** Metadata from the matched route */
  meta?: Record<string, unknown>;
};
