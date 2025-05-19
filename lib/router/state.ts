import { signal } from "../reactive";
import type { RouteInfo, RouteValue } from "../types";

export const routes = signal<Record<string, RouteValue<string> | string>>({});

export const hooks = signal<{
  before?: () => unknown;
  after?: () => unknown;
  404?: () => unknown;
  redirects?: { from: string[]; to: string }[];
}>({});

export const route = signal<RouteInfo>({
  handler: null,
  params: {},
  query: {},
  path: typeof window !== "undefined"
    ? window.location.pathname + window.location.search
    : "/"
});