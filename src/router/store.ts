import { store, StoreSignals } from "../reactive";
import { RouterState, Routes, RouterResult, RouteParams } from "./types";
import { checkGuards, checkRedirects } from "./hooks";
import { matchRoute } from "./utils";

let routerState: StoreSignals<RouterState>;

// Router store instance managing application routing state
export const router = () =>
  routerState ||
  (routerState = store<RouterState>((state) => {
    // Updates URL and router state with new path
    function updateUrl(path: string): void {
      const isSamePath = path === state.currentPath();
      if (!isSamePath) {
        history.pushState(null, "", path);
        state.currentPath.set(path);
        const currentHistory = state.history();
        state.history.set([...currentHistory, path]);
      }
    }

    // Recursively resolves redirect chain for given path
    function resolveRedirects(path: string): string {
      let currentPath = path;
      let nextPath = checkRedirects(currentPath);
      while (nextPath !== currentPath) {
        currentPath = nextPath;
        nextPath = checkRedirects(currentPath);
      }
      return currentPath;
    }

    // Validates route against guards and returns navigation result
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

    // Matches path against route patterns and executes handlers
    async function matchAndExecuteRoute(path: string): Promise<boolean> {
      for (const [pattern, handler] of Object.entries(state.routes())) {
        const params = matchRoute(pattern, path);
        if (params) {
          return typeof handler === "string"
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

    // Core navigation logic handling redirects and guards
    async function handleNavigation(
      path: string,
      updateHistory: boolean
    ): Promise<boolean> {
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

    // Sets up router with routes and initial navigation
    function initializeRouter(routes: Routes): void {
      state.routes.set(routes);
      setupPopStateHandler();
      const initialPath = resolveRedirects(window.location.pathname);
      state.currentPath.set(initialPath);
      updateUrl(initialPath);
      navigateToNewPath(initialPath, false);
    }

    // Browser history pop state handler
    function setupPopStateHandler(): void {
      window.addEventListener("popstate", () =>
        handleNavigation(window.location.pathname, false)
      );
    }

    function navigateBack(fallbackPath?: string): void {
      const currentHistory = state.history();
      if (currentHistory.length > 1) {
        currentHistory.pop();
        state.history.set(currentHistory);
        history.back();
      } else if (fallbackPath) {
        state.navigate(fallbackPath);
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
