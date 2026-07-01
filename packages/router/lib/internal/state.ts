import { signal } from "./core";
import type { GlobalHooks, RouteValue, Redirect, HistoryMode, ScrollBehavior } from "../types";

/**
 * Signal containing the current route map.
 * @internal
 */
export const routes = signal<Record<string, RouteValue | string>>({});

/**
 * Signal containing global hooks configuration.
 * @internal
 */
export const hooks = signal<GlobalHooks>({});

/**
 * Signal containing redirect rules.
 * @internal
 */
export const redirects = signal<Redirect[]>([]);

/**
 * Signal containing the not found handler.
 * @internal
 */
export const notFound = signal<string | (() => void) | null>(null);

/**
 * Signal containing the current history mode.
 * @internal
 */
export const mode = signal<HistoryMode>("history");

/**
 * Signal containing scroll behavior configuration.
 * @internal
 */
export const scrollBehavior = signal<ScrollBehavior | undefined>(undefined);

/**
 * Previous path used by scroll behavior to determine navigation direction.
 * @internal
 */
export const previousPath = signal<string>("/");

/**
 * Signal enabling meta inheritance through nested route chains.
 * When true, parent route meta cascades down to child routes.
 * @internal
 */
export const inheritMeta = signal<boolean>(false);
