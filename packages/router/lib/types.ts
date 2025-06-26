export type ExtractRouteParams<S extends string> =
  S extends `${infer _Start}/:${infer Param}/${infer Rest}`
  ? { [k in Param | keyof ExtractRouteParams<`/${Rest}`>]: string }
  : S extends `${infer _Start}/:${infer Param}`
  ? { [k in Param]: string }
  : {};

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

export type RouteValue<S extends string> =
  | RouteHandler<S>
  | {
    handler: RouteHandler<S>;
    before?: RouteHandler<S>;
    after?: RouteHandler<S>;
  };

export interface RouterHooks {
  before?: () => unknown;
  after?: () => unknown;
  404?: () => unknown;
  redirects?: { from: string[]; to: string }[];
}

export type RouteMapOrRedirects<T extends Record<string, unknown>> = {
  [K in keyof T]: RouteValue<K & string> | string;
};

export type RouteInfo = {
  handler: RouteHandler<string> | null;
  params: Record<string, string>;
  query: Record<string, string>;
  path: string;
};

export type HandlerWithParams = (params: Record<string, string>, query?: Record<string, string>) => unknown;
export type HandlerWithoutParams = (query?: Record<string, string>) => unknown;