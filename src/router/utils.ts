import { RouteParams, RoutePatternMatch } from "../types";

export function getWildcardPortion(pattern: string, path: string): string {
  if (!pattern.endsWith("*")) return "";
  const basePath = pattern.slice(0, -1);
  return path === basePath.slice(0, -1) ? "" : path.slice(basePath.length);
}

export function matchPath(pattern: string, path: string): boolean {
  if (pattern === path) return true;
  if (pattern.endsWith("*")) return matchWildcardPath(pattern, path);
  return createPathRegex(pattern).test(path);
}

export function matchRoute(pattern: string, path: string): RouteParams | null {
  if (!matchPath(pattern, path)) return null;

  const paramNames = extractParamNames(pattern);
  return pattern.endsWith("*")
    ? matchWildcardRoute(pattern, path, paramNames)
    : matchStaticRoute(pattern, path, paramNames);
}

function matchWildcardPath(pattern: string, path: string): boolean {
  const basePath = pattern.slice(0, -1);
  return path === basePath.slice(0, -1) || path.startsWith(basePath);
}

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

function matchStaticRoute(
  pattern: string,
  path: string,
  paramNames: string[]
): RouteParams | null {
  const { matches } = createStaticMatch(pattern, path);
  return matches ? extractParamsFromMatches(paramNames, matches) : null;
}

function createWildcardMatch(pattern: string, path: string): RoutePatternMatch {
  const paramPattern = pattern.slice(0, -1).replace(/:[^/]+/g, "([^/]+)");

  return {
    pattern: paramPattern,
    matches: path.match(new RegExp(`^${paramPattern}`)),
  };
}

function createStaticMatch(pattern: string, path: string): RoutePatternMatch {
  const regexPattern = pattern.replace(/:[^/]+/g, "([^/]+)");
  return {
    pattern: regexPattern,
    matches: path.match(new RegExp(`^${regexPattern}$`)),
  };
}

function extractParamNames(pattern: string): string[] {
  return pattern.match(/:[^/]+/g)?.map((param) => param.slice(1)) || [];
}

function extractParams(
  result: RouteParams,
  paramNames: string[],
  matches: RegExpMatchArray
): void {
  paramNames.forEach((param, index) => {
    result[param] = matches[index + 1];
  });
}

function extractParamsFromMatches(
  paramNames: string[],
  matches: RegExpMatchArray
): RouteParams {
  return paramNames.reduce((params, param, index) => {
    params[param] = matches[index + 1];
    return params;
  }, {} as RouteParams);
}

function createPathRegex(pattern: string): RegExp {
  const regexPattern = pattern
    .replace(/\//g, "\\/")
    .replace(/:[^/]+/g, "([^/]+)");
  return new RegExp(`^${regexPattern}$`);
}
