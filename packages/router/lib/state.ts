import { signal } from "@hellajs/core";
import type { RouteInfo, RouterHooks, RouteValue } from "./types";

export const routes = signal<Record<string, RouteValue<string> | string>>({});

export const hooks = signal<RouterHooks>({});

export const route = signal<RouteInfo>({
  handler: null,
  params: {},
  query: {},
  path: typeof window !== "undefined"
    ? window.location.pathname + window.location.search
    : "/"
});