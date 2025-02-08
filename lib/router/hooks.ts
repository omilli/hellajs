import { effect } from "../reactive";
import { RedirectConfig, RouterGuard, RouterGuardResult } from "./types";
import { ROUTER_STATE } from "./global";
import { router } from "./store";
import { getWildcardPortion, matchPath } from "./utils";

// Processes redirect configurations for a given path
export function checkRedirects(path: string): string {
  for (const redirect of ROUTER_STATE.redirects) {
    const redirectPath = handleRedirect(redirect, path);
    if (redirectPath) return redirectPath;
  }
  return path;
}

// Registers redirect rules for route paths
export function routerRedirect(from: string | string[], to: string): void {
  const fromPaths = Array.isArray(from) ? from : [from];
  fromPaths.forEach((path) => {
    ROUTER_STATE.redirects.push({ from: path, to });
    window.location.pathname === path && router().navigate(to);
  });
}

// Registers guard functions for protected routes
export function routerGuard(paths: string[], guard: RouterGuard): void {
  ROUTER_STATE.guards.push({
    paths: Array.isArray(paths) ? paths : [paths],
    guard,
  });
}

// Validates path against registered guards
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

// Pre-navigation hook for route changes
export function beforeNavigate(
  paths: string[],
  callback: (path: string) => void
): () => void {
  return createNavigationEffect(callback, (current, last) =>
    shouldTriggerNavigate(current, last, paths)
  );
}

// Post-navigation hook for route changes
export function afterNavigate(
  paths: string[],
  callback: (path: string) => void
): () => void {
  return createNavigationEffect(
    callback,
    (current) => paths.length === 0 || paths.includes(current)
  );
}

// Processes wildcard redirects with parameter substitution
function processWildcardRedirect(
  redirect: RedirectConfig,
  path: string
): string {
  const fromPath = Array.isArray(redirect.from)
    ? redirect.from[0]
    : redirect.from;
  const wildcardPortion = getWildcardPortion(fromPath, path);
  return wildcardPortion
    ? redirect.to.replace("*", wildcardPortion)
    : redirect.to.replace("/*", "");
}

// Redirect resolution for a single configuration
function handleRedirect(redirect: RedirectConfig, path: string): string | null {
  const fromPaths = Array.isArray(redirect.from)
    ? redirect.from
    : [redirect.from];
  const matchingPath = fromPaths.find((fromPath) => matchPath(fromPath, path));
  if (!matchingPath) return null;

  return matchingPath.endsWith("*") && redirect.to.includes("*")
    ? processWildcardRedirect({ from: matchingPath, to: redirect.to }, path)
    : redirect.to;
}

// Determines if navigation hook should trigger
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

// Effect for navigation hook tracking
function createNavigationEffect(
  callback: (path: string) => void,
  condition: (currentPath: string, lastPath: string) => boolean
): () => void {
  let lastPath = router().currentPath();
  return effect(() => {
    const currentPath = router().currentPath();
    condition(currentPath, lastPath) &&
      queueMicrotask(() => callback(currentPath));
    lastPath = currentPath;
  });
}
