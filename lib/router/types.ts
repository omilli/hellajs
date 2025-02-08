export type RouteParams = Record<string, string>;
export type CleanupFunction = () => void;
export type RouteHandler =
  | string
  | ((
      params: RouteParams
    ) =>
      | void
      | CleanupFunction
      | undefined
      | Promise<void | CleanupFunction | undefined>);
export type Routes = Record<string, RouteHandler>;
export type RoutePatternMatch = {
  matches: RegExpMatchArray | null;
  pattern: string;
};
export type RouterEventType = "beforeNavigate" | "afterNavigate";
export type RouterEventHandler = (path: string) => void;
export type RouterState = {
  currentPath: string;
  params: RouteParams;
  routes: Routes;
  navigate: (path: string) => void;
  back: (path?: string) => void;
  start: (routes: Routes) => void;
  currentCleanup: CleanupFunction | null;
  history: string[];
  on: (event: RouterEventType, handler: RouterEventHandler) => void;
  off: (event: RouterEventType, handler: RouterEventHandler) => void;
};
