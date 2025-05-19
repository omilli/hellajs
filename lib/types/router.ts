// Extract param names from route string
export type ExtractRouteParams<S extends string> =
  S extends `${infer _Start}/:${infer Param}/${infer Rest}`
  ? { [k in Param | keyof ExtractRouteParams<`/${Rest}`>]: string }
  : S extends `${infer _Start}/:${infer Param}`
  ? { [k in Param]: string }
  : {};

// Route handler type for a given route string, supporting params and query
export type RouteHandler<S extends string> =
  keyof ExtractRouteParams<S> extends never
  ? (
    // No params
    query?: Record<string, string>
  ) => Promise<unknown> | unknown
  : (
    params: ExtractRouteParams<S>,
    query?: Record<string, string>
  ) => Promise<unknown> | unknown;

// Allow route value to be a handler or an object with handler/before/after hooks, all supporting params+query
export type RouteValue<S extends string> =
  | RouteHandler<S>
  | {
    handler: RouteHandler<S>;
    before?: RouteHandler<S>;
    after?: RouteHandler<S>;
  };

export type RouteMapOrRedirects<T extends Record<string, unknown>> = {
  [K in keyof T]: RouteValue<K & string> | string;
};

export type RouteInfo = {
  handler: RouteHandler<string> | null;
  params: Record<string, string>;
  query: Record<string, string>;
  path: string;
};

// Abstract handler signatures for use in implementation
export type HandlerWithParams = (params: Record<string, string>, query?: Record<string, string>) => unknown;
export type HandlerWithoutParams = (query?: Record<string, string>) => unknown;