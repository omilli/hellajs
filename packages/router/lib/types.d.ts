// Core types
/**
 * Record type for route parameters and query strings.
 */
export type Params = Record<string, string>;
/**
 * Generic function type for route handlers and hooks.
 */
export type Handler = (...args: any[]) => Promise<unknown> | unknown;

// Router configuration
/**
 * Configuration object for router initialization.
 * @template T Route map type extending base record
 */
export type RouterConfig<T = Record<string, unknown>> = {
  routes: Routes<T>;
  hooks?: GlobalHooks;
  notFound?: () => void;
  redirects?: Redirect[];
};

// Route structures
/**
 * Type-safe route map with string keys and route values.
 * @template T Route map type extending base record
 */
export type Routes<T = Record<string, unknown>> = {
  [K in keyof T]: RouteValue | string;
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
  children?: Routes;
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
export type NavigateOptions = {
  replace?: boolean;
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
};