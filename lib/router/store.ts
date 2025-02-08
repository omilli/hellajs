import { store, StoreSignals } from "../reactive";
import {
  RouterState,
  Routes,
  RouteParams,
  RouterEventType,
  RouterEventHandler,
} from "./types";
import { matchRoute } from "./utils";
import { validatePath, validateNavigationRate } from "./validation";
import { isString } from "../global";

let routerState: StoreSignals<RouterState>;

export const router = () =>
  routerState ||
  (routerState = store<RouterState>((state) => {
    let isHandlingPopState = false;
    const events: Record<RouterEventType, Set<RouterEventHandler>> = {
      beforeNavigate: new Set(),
      afterNavigate: new Set(),
    };

    function emit(event: RouterEventType, path: string): void {
      events[event].forEach((handler) => handler(path));
    }

    function updateUrl(path: string): void {
      const isSamePath = path === state.currentPath();
      if (!isSamePath && !isHandlingPopState) {
        history.pushState(null, "", path);
        state.currentPath.set(path);
        const currentHistory = state.history();
        state.history.set([...currentHistory, path]);
      }
    }

    async function matchAndExecuteRoute(path: string): Promise<boolean> {
      for (const [pattern, handler] of Object.entries(state.routes())) {
        const params = matchRoute(pattern, path);
        if (params) {
          if (isString(handler)) {
            emit("beforeNavigate", handler);
            const result = await handleNavigation(handler, true, true);
            result && emit("afterNavigate", handler);
            return result;
          }
          return executeRouteHandler(handler, params);
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
      updateHistory: boolean,
      skipEvents = false
    ): Promise<boolean> {
      if (isHandlingPopState) return true;
      if (!validateNavigationRate()) return false;
      if (!validatePath(path)) {
        console.error("Invalid path detected");
        return false;
      }
      !skipEvents && emit("beforeNavigate", path);
      const isSamePath = path === state.currentPath();
      const result = isSamePath
        ? true
        : await navigateToNewPath(path, updateHistory);
      !skipEvents && result && emit("afterNavigate", path);
      return result;
    }

    async function navigateToNewPath(
      path: string,
      updateHistory: boolean
    ): Promise<boolean> {
      updateHistory && updateUrl(path);
      return await matchAndExecuteRoute(path);
    }

    async function handlePopState(): Promise<void> {
      if (isHandlingPopState) return;
      isHandlingPopState = true;
      const path = window.location.pathname;
      state.currentPath.set(path);
      await matchAndExecuteRoute(path);
      isHandlingPopState = false;
    }

    function initializeRouter(routes: Routes): void {
      state.routes.set(routes);
      setupPopStateHandler();
      const initialPath = window.location.pathname;
      emit("beforeNavigate", initialPath);
      state.currentPath.set(initialPath);
      updateUrl(initialPath);
      matchAndExecuteRoute(initialPath).then(() => {
        emit("afterNavigate", initialPath);
      });
    }

    function setupPopStateHandler(): void {
      window.addEventListener("popstate", () => handlePopState());
    }

    function navigateBack(fallbackPath?: string): void {
      const currentHistory = state.history();
      const shouldUseFallback = currentHistory.length <= 1 && fallbackPath;
      shouldUseFallback ? state.navigate(fallbackPath!) : history.back();
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
      on: (event: RouterEventType, handler: RouterEventHandler) =>
        events[event].add(handler),
      off: (event: RouterEventType, handler: RouterEventHandler) =>
        events[event].delete(handler),
    };
  }));
