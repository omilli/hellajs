import { router } from "./store";
import { RouteParams, RoutePatternMatch } from "./types";
import { validateRouteParam } from "./validation";

// Checks if a path is the root of the current active path
export function isActiveRoute(path: string): boolean {
  return path === "/"
    ? router().currentPath() === "/"
    : router().currentPath().startsWith(path);
}

// Extracts wildcard portion from matched path
export function getWildcardPortion(pattern: string, path: string): string {
  if (!pattern.endsWith("*")) return "";
  const basePath = pattern.slice(0, -1);
  return path === basePath.slice(0, -1) ? "" : path.slice(basePath.length);
}

// Checks if a path matches a route pattern
export function matchPath(pattern: string, path: string): boolean {
  if (pattern === path) return true;
  if (pattern.endsWith("*")) return matchWildcardPath(pattern, path);
  return createPathRegex(pattern).test(path);
}

// Parameters from matched route pattern
export function matchRoute(pattern: string, path: string): RouteParams | null {
  if (!matchPath(pattern, path)) return null;

  const paramNames = extractParamNames(pattern);
  return pattern.endsWith("*")
    ? matchWildcardRoute(pattern, path, paramNames)
    : matchStaticRoute(pattern, path, paramNames);
}

// Tests wildcard path patterns against current path
function matchWildcardPath(pattern: string, path: string): boolean {
  const basePath = pattern.slice(0, -1);
  return path === basePath.slice(0, -1) || path.startsWith(basePath);
}

// Parameters from wildcard routes including wildcard portion
function matchWildcardRoute(
  pattern: string,
  path: string,
  paramNames: string[]
): RouteParams {
  const result: RouteParams = {};
  const wildcardPortion = getWildcardPortion(pattern, path);

  if (wildcardPortion) {
    result["*"] = wildcardPortion;
  }

  if (paramNames.length > 0) {
    const { matches } = createWildcardMatch(pattern, path);
    if (matches) {
      extractParams(result, paramNames, matches);
    }
  }

  return result;
}

// Extracts parameters from static routes
function matchStaticRoute(
  pattern: string,
  path: string,
  paramNames: string[]
): RouteParams | null {
  const { matches } = createStaticMatch(pattern, path);
  return matches ? extractParamsFromMatches(paramNames, matches) : null;
}

// Match for wildcard patterns
function createWildcardMatch(pattern: string, path: string): RoutePatternMatch {
  const paramPattern = pattern.slice(0, -1).replace(/:[^/]+/g, "([^/]+)");

  return {
    pattern: paramPattern,
    matches: path.match(new RegExp(`^${paramPattern}`)),
  };
}

// Match for static patterns
function createStaticMatch(pattern: string, path: string): RoutePatternMatch {
  const regexPattern = pattern.replace(/:[^/]+/g, "([^/]+)");
  return {
    pattern: regexPattern,
    matches: path.match(new RegExp(`^${regexPattern}$`)),
  };
}

// Extracts parameter names from route pattern
function extractParamNames(pattern: string): string[] {
  return pattern.match(/:[^/]+/g)?.map((param) => param.slice(1)) || [];
}

// Maps matched parameters to their names
function extractParams(
  result: RouteParams,
  paramNames: string[],
  matches: RegExpMatchArray
): void {
  paramNames.forEach((param, index) => {
    result[param] = matches[index + 1];
  });
}

// Params object from regex matches
function extractParamsFromMatches(
  paramNames: string[],
  matches: RegExpMatchArray
): RouteParams {
  return paramNames.reduce((params, param, index) => {
    const value = matches[index + 1];
    params[param] = validateRouteParam(value) ? value : "";
    return params;
  }, {} as RouteParams);
}

// Pattern for route matching
function createPathRegex(pattern: string): RegExp {
  const regexPattern = pattern
    .replace(/\//g, "\\/")
    .replace(/:[^/]+/g, "([^/]+)");
  return new RegExp(`^${regexPattern}$`);
}
