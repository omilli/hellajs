import { store, StoreSignals } from "../reactive";
import { RouterState, Routes, RouterResult, RouteParams } from "./types";
import { checkGuards, checkRedirects } from "./hooks";
import { matchRoute } from "./utils";
import {
  validatePath,
  validateNavigationRate,
  validateRedirectCount,
  resetRedirectCount,
} from "./validation";
import { isString } from "../global";

let routerState: StoreSignals<RouterState>;

export const router = () =>
  routerState ||
  (routerState = store<RouterState>((state) => {
    let isHandlingPopState = false;

    function updateUrl(path: string): void {
      const isSamePath = path === state.currentPath();
      if (!isSamePath && !isHandlingPopState) {
        history.pushState(null, "", path);
        state.currentPath.set(path);
        const currentHistory = state.history();
        state.history.set([...currentHistory, path]);
      }
    }

    function resolveRedirects(path: string): string {
      if (!validateRedirectCount()) {
        console.error("Too many redirects");
        return path;
      }
      let currentPath = path;
      let nextPath = checkRedirects(currentPath);
      while (nextPath !== currentPath) {
        currentPath = nextPath;
        nextPath = checkRedirects(currentPath);
      }
      resetRedirectCount();
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

    async function matchAndExecuteRoute(path: string): Promise<boolean> {
      for (const [pattern, handler] of Object.entries(state.routes())) {
        const params = matchRoute(pattern, path);
        if (params) {
          return isString(handler)
            ? handleNavigation(handler, true)
            : executeRouteHandler(handler, params);
        }
      }
      return false;
    }

    async function executeRouteHandler(
      handler: CallableFunction,
      params: RouteParams
    ): Promise<boolean> {
      state.currentCleanup() && state.currentCleanup()?.();
      state.params.set(params);
      const cleanup = await handler(params);
      state.currentCleanup.set(cleanup || null);
      return true;
    }

    async function handleNavigation(
      path: string,
      updateHistory: boolean
    ): Promise<boolean> {
      if (isHandlingPopState) return true;
      if (!validateNavigationRate()) return false;
      if (!validatePath(path)) {
        console.error("Invalid path detected");
        return false;
      }

      const finalPath = resolveRedirects(path);
      const currentResolvedPath = resolveRedirects(state.currentPath());
      const isSamePath = finalPath === currentResolvedPath;

      return isSamePath ? true : navigateToNewPath(finalPath, updateHistory);
    }

    async function navigateToNewPath(
      finalPath: string,
      updateHistory: boolean
    ): Promise<boolean> {
      const guardResult = handleGuard(finalPath);
      if (!guardResult.handled) {
        guardResult.path !== finalPath && state.navigate(guardResult.path);
        return false;
      }
      updateHistory && updateUrl(guardResult.path);
      return await matchAndExecuteRoute(guardResult.path);
    }

    async function handlePopState(): Promise<void> {
      if (isHandlingPopState) return;
      isHandlingPopState = true;

      const path = window.location.pathname;
      const finalPath = resolveRedirects(path);
      state.currentPath.set(finalPath);
      await matchAndExecuteRoute(finalPath);

      isHandlingPopState = false;
    }

    function initializeRouter(routes: Routes): void {
      state.routes.set(routes);
      setupPopStateHandler();
      const initialPath = resolveRedirects(window.location.pathname);
      state.currentPath.set(initialPath);
      updateUrl(initialPath);
      navigateToNewPath(initialPath, false);
    }

    function setupPopStateHandler(): void {
      window.addEventListener("popstate", () => handlePopState());
    }

    function navigateBack(fallbackPath?: string): void {
      const currentHistory = state.history();
      const shouldUseFallback = currentHistory.length <= 1 && fallbackPath;

      if (shouldUseFallback) {
        state.navigate(fallbackPath);
      } else {
        currentHistory.pop();
        state.history.set(currentHistory);
        history.back();
      }
    }

    return {
      currentPath: window.location.pathname,
      params: {},
      routes: {},
      currentCleanup: null,
      history: [window.location.pathname],
      start: initializeRouter,
      navigate: (path: string) => handleNavigation(path, true),
      back: navigateBack,
    };
  }));
