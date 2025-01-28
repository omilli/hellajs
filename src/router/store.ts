import { store } from "../reactive";
import { RouterState, Routes, RouteParams } from "../types";
import { checkGuards, checkRedirects } from "./hooks";
import { matchRoute } from "./utils";

type RouterResult = { handled: boolean; path: string };

export const router = store<RouterState>((state) => {
  function updateUrl(path: string): void {
    history.pushState(null, "", path);
    state.currentPath.set(path);
  }

  function resolveRedirects(path: string): string {
    let currentPath = path;
    let nextPath = checkRedirects(currentPath);

    while (nextPath !== currentPath) {
      currentPath = nextPath;
      nextPath = checkRedirects(currentPath);
    }

    return currentPath;
  }

  function handleGuard(path: string): RouterResult {
    const guardResult = checkGuards(path);

    if (!guardResult.allowed) {
      return {
        handled: false,
        path: guardResult.redirectTo || path,
      };
    }

    return { handled: true, path };
  }

  function matchAndExecuteRoute(path: string): boolean {
    for (const [pattern, handler] of Object.entries(state.routes())) {
      const params = matchRoute(pattern, path);
      if (params) {
        executeRoute(params, handler);
        return true;
      }
    }
    return false;
  }

  function executeRoute(
    params: RouteParams,
    handler: (params: RouteParams) => void
  ): void {
    state.params.set(params);
    handler(params);
  }

  function handleNavigation(path: string, updateHistory: boolean): boolean {
    const finalPath = resolveRedirects(path);
    const guardResult = handleGuard(finalPath);

    if (!guardResult.handled) {
      if (guardResult.path !== path) {
        state.navigate(guardResult.path);
      }
      return false;
    }

    if (updateHistory) {
      updateUrl(guardResult.path);
    }

    return matchAndExecuteRoute(guardResult.path);
  }

  function initializeRouter(routes: Routes): void {
    state.routes.set(routes);
    setupPopStateHandler();
    handleNavigation(window.location.pathname, true);
  }

  function setupPopStateHandler(): void {
    window.addEventListener("popstate", () =>
      handleNavigation(window.location.pathname, false)
    );
  }

  function handleBackNavigation(fallbackPath?: string): void {
    if (shouldNavigateToFallback(fallbackPath)) {
      state.navigate(fallbackPath!);
    } else {
      history.back();
    }
  }

  function shouldNavigateToFallback(fallbackPath?: string): boolean {
    if (!fallbackPath) return false;
    const referrer = document.referrer;
    return !referrer || !referrer.includes(window.location.host);
  }

  return {
    currentPath: window.location.pathname,
    params: {},
    routes: {},

    start: initializeRouter,
    navigate: (path: string) => handleNavigation(path, true),
    back: handleBackNavigation,
  };
});
