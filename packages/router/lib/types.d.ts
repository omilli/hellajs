// Core types
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Handler = (...args: any[]) => any;

// Router configuration
/**
 * History mode for URL management.
 */
export type HistoryMode = 'history' | 'hash';

/**
 * Scroll behavior configuration.
 * - 'auto': Browser default (no intervention)
 * - 'top': Always scroll to top on navigation
 * - 'preserve': Keep current scroll position
 * - Custom function returning scroll position or null to skip
 */
export type ScrollBehavior =
  | 'auto'
  | 'top'
  | 'preserve'
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
  handler?: Handler;
  before?: Handler;
  after?: Handler;
  meta?: Record<string, unknown>;
  scroll?: ScrollBehavior | false;
  children?: Routes;
};

/**
 * Configuration object for router initialization.
 */
export type RouterConfig = {
  routes: Routes;
  hooks?: GlobalHooks;
  notFound?: () => void;
  redirects?: Redirect[];
  mode?: HistoryMode;
  scrollBehavior?: ScrollBehavior;
};

// Global hooks
/**
 * Global hooks that execute on every route change.
 */
export type GlobalHooks = {
  before?: () => Promise<unknown> | unknown;
  after?: () => Promise<unknown> | unknown;
};

// Navigation and redirects
/**
 * Options for programmatic navigation.
 */
export type NavigateOptions<T extends string = string> = {
  params?: ExtractParams<T>;
  query?: Params;
  replace?: boolean;
  scroll?: ScrollBehavior | false;
  meta?: Record<string, unknown>;
};

/**
 * Redirect configuration mapping source paths to target path.
 */
export type Redirect = {
  readonly from: readonly string[];
  readonly to: string;
};

// Route state and matching
/**
 * Current route state information.
 */
export type RouteInfo = {
  handler: Handler | null;
  params: Params;
  query: Params;
  path: string;
  meta?: Record<string, unknown>;
};

/**
 * Internal route matching result with extracted parameters.
 */
export type RouteMatch = {
  routeValue: RouteValue;
  params: Params;
  query: Params;
  remainingPath: string;
  fullPath: string;
  meta?: Record<string, unknown>;
};