import { effect } from "../reactive";
import { RedirectConfig, RouterGuard, RouterGuardResult } from "../types";
import { ROUTER_STATE } from "../global";
import { router } from "./store";
import { getWildcardPortion, matchPath } from "./utils";

export function checkRedirects(path: string): string {
  for (const redirect of ROUTER_STATE.redirects) {
    const redirectPath = handleRedirect(redirect, path);
    if (redirectPath) return redirectPath;
  }
  return path;
}

export function routerRedirect(from: string, to: string): void {
  ROUTER_STATE.redirects.push({ from, to });
  // Handle redirect immediately if we're on the 'from' path
  if (window.location.pathname === from) {
    router.navigate(to);
  }
}

export function routerGuard(paths: string[], guard: RouterGuard): void {
  ROUTER_STATE.guards.push({
    paths: Array.isArray(paths) ? paths : [paths],
    guard,
  });
}

export function checkGuards(path: string): RouterGuardResult {
  for (const { paths, guard } of ROUTER_STATE.guards) {
    if (paths.some((pattern) => matchPath(pattern, path))) {
      const result = guard(path);
      const guardResult = result.allowed ? null : result;
      if (guardResult) return guardResult;
    }
  }
  return { allowed: true };
}

export function beforeNavigate(
  paths: string[],
  callback: (path: string) => void
): () => void {
  return createNavigationEffect(callback, (current, last) =>
    shouldTriggerNavigate(current, last, paths)
  );
}

export function afterNavigate(
  paths: string[],
  callback: (path: string) => void
): () => void {
  return createNavigationEffect(
    callback,
    (current) => paths.length === 0 || paths.includes(current)
  );
}

function processWildcardRedirect(
  redirect: RedirectConfig,
  path: string
): string {
  const wildcardPortion = getWildcardPortion(redirect.from, path);
  return wildcardPortion
    ? redirect.to.replace("*", wildcardPortion)
    : redirect.to.replace("/*", "");
}

function handleRedirect(redirect: RedirectConfig, path: string): string | null {
  if (!matchPath(redirect.from, path)) return null;
  if (redirect.from.endsWith("*") && redirect.to.includes("*")) {
    return processWildcardRedirect(redirect, path);
  }
  return redirect.to;
}

function shouldTriggerNavigate(
  currentPath: string,
  lastPath: string,
  paths: string[]
): boolean {
  return (
    currentPath !== lastPath &&
    (paths.length === 0 ||
      paths.some((pattern) => matchPath(pattern, currentPath)))
  );
}

function createNavigationEffect(
  callback: (path: string) => void,
  condition: (currentPath: string, lastPath: string) => boolean
): () => void {
  let lastPath = router.currentPath();
  return effect(() => {
    const currentPath = router.currentPath();
    condition(currentPath, lastPath) &&
      queueMicrotask(() => callback(currentPath));
    lastPath = currentPath;
  });
}
