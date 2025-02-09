import {
  RouterState,
  RouterContext,
  RouterEmitArgs,
  RouterNavigationArgs,
  RouteExecutionArgs,
  RouterInitArgs,
  RouterUrlArgs,
  Routes,
  RouterNavigatePathArgs,
} from "./router.types";
import { HELLA_ROUTER } from "./router.global";
import { matchRoute } from "./router.utils";
import { validatePath, validateNavigationRate } from "./router.validation";
import { isString } from "../global";
import { store } from "../store";

/** Router store factory */
export function router() {
  if (HELLA_ROUTER.store) return HELLA_ROUTER.store;

  const initialState = {
    currentPath: window.location.pathname,
    params: {},
    routes: {},
    currentCleanup: null,
    history: [window.location.pathname],
  };

  HELLA_ROUTER.store = store<RouterState>((state) => {
    const context: RouterContext = {
      state,
      events: HELLA_ROUTER.events,
      isHandlingPopState: false,
    };

    return {
      ...initialState,
      start: (routes: Routes) => initRouter({ context, routes }),
      navigate: (path: string) =>
        navigationPipeline({
          context,
          path,
          updateHistory: true,
        }),
      back: (fallback?: string) => {
        const hasHistory = state.history().length > 1;
        hasHistory ? history.back() : fallback && state.navigate(fallback);
      },
      on: (event, handler) => context.events[event].add(handler),
      off: (event, handler) => context.events[event].delete(handler),
    };
  });

  return HELLA_ROUTER.store;
}

/** Safely emit router events with error boundary */
function emit({ context, event, path }: RouterEmitArgs): void {
  context.events[event].forEach((handler) => {
    try {
      handler(path);
    } catch (err) {
      console.error(`Router event handler error: ${err}`);
    }
  });
}

/** Update URL and history state */
function urlManager({ context, path }: RouterUrlArgs): void {
  if (path === context.state.currentPath() || context.isHandlingPopState)
    return;

  history.pushState(null, "", path);
  context.state.currentPath.set(path);
  context.state.history.set([...context.state.history(), path]);
}

/** Execute route handler and manage cleanup */
async function executeRoute({
  context,
  handler,
  params,
}: RouteExecutionArgs): Promise<boolean> {
  const cleanup = context.state.currentCleanup();
  cleanup?.();

  context.state.params.set(params);
  const newCleanup = await handler(params);
  context.state.currentCleanup.set(newCleanup || null);

  return true;
}

/** Handle route redirection */
async function redirectPipeline({
  context,
  path,
}: RouterUrlArgs): Promise<boolean> {
  emit({ context, event: "beforeNavigate", path });
  const result = await navigationPipeline({
    context,
    path,
    updateHistory: true,
    skipEvents: true,
  });
  result && emit({ context, event: "afterNavigate", path });
  return result;
}

/** Match and execute route handlers */
async function routePipeline({
  context,
  path,
}: RouterUrlArgs): Promise<boolean> {
  const routes = context.state.routes();
  const matchedRoute = Object.entries(routes).find(([pattern]) =>
    matchRoute(pattern, path)
  );

  if (!matchedRoute) return false;

  const [pattern, handler] = matchedRoute;
  const params = matchRoute(pattern, path);

  return isString(handler)
    ? redirectPipeline({ context, path: handler })
    : executeRoute({
        context,
        handler: handler as CallableFunction,
        params: params!,
      });
}

/** Manage navigation state and validation */
async function navigationPipeline({
  context,
  path,
  updateHistory,
  skipEvents = false,
}: RouterNavigationArgs): Promise<boolean> {
  if (context.isHandlingPopState) return true;
  if (!validateNavigationRate()) return false;
  if (!validatePath(path)) {
    console.error("Invalid path detected");
    return false;
  }

  !skipEvents && emit({ context, event: "beforeNavigate", path });

  const result =
    path === context.state.currentPath()
      ? true
      : await navigateToPath({ context, path, updateHistory });

  !skipEvents && result && emit({ context, event: "afterNavigate", path });
  return result;
}

/** Execute path navigation */
async function navigateToPath({
  context,
  path,
  updateHistory,
}: RouterNavigatePathArgs): Promise<boolean> {
  updateHistory && urlManager({ context, path });
  return routePipeline({ context, path });
}

/** Handle popstate events */
async function popStateHandler(context: RouterContext): Promise<void> {
  if (context.isHandlingPopState) return;

  context.isHandlingPopState = true;
  const path = window.location.pathname;
  context.state.currentPath.set(path);
  await routePipeline({ context, path });
  context.isHandlingPopState = false;
}

/** Initialize router with routes */
function initRouter({ context, routes }: RouterInitArgs): void {
  context.state.routes.set(routes);
  window.addEventListener("popstate", () => popStateHandler(context));
  const path = window.location.pathname;
  emit({ context, event: "beforeNavigate", path });
  context.state.currentPath.set(path);
  urlManager({ context, path });
  routePipeline({ context, path }).then(() =>
    emit({ context, event: "afterNavigate", path })
  );
}
