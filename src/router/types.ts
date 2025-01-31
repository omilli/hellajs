export type RouteParams = Record<string, string>;
export type RouteHandler = (params: RouteParams) => void;
export type Routes = Record<string, RouteHandler>;
export type RoutePatternMatch = {
  matches: RegExpMatchArray | null;
  pattern: string;
};
export type RouterState = {
  currentPath: string;
  params: RouteParams;
  routes: Routes;
  navigate: (path: string) => void;
  back: (path?: string) => void;
  start: (routes: Routes) => void;
};

export type RouterGuardResult = {
  allowed: boolean;
  redirectTo?: string;
};

export type RouterGuard = (path: string) => RouterGuardResult;

export type RedirectConfig = { from: string; to: string };

export type RouterResult = { handled: boolean; path: string };
