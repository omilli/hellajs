import type { ErrorConfig, ErrorContext, ErrorFn } from "../types/nodes";
import type { TemplateBuildFn } from "../runtime";
import { setErrorDispatch } from "../internal/dispatch";
import { isNull } from "../internal/core";
import { peekState } from "../internal/state";

/**
 * Global error handlers registered via onError. First non-null result wins.
 */
const handlers = new Set<ErrorFn>();

const NOOP = () => {};

/**
 * Registers a global error handler.
 * Multiple handlers can be registered - they execute in order, first non-null result wins.
 * @param fn Error handler function, or null to clear all handlers
 * @returns Remove function to unregister this handler
 */
export function onError(fn: ErrorFn | null): () => void {
  if (isNull(fn)) {
    handlers.clear();
    return NOOP;
  }
  handlers.add(fn);
  return () => handlers.delete(fn);
}

/**
 * Finds the nearest error boundary element by walking up the DOM tree.
 * Caches result on the origin element for O(1) subsequent lookups.
 * @param origin The element where the error occurred
 * @returns The boundary element, or null if none found
 */
function findBoundary(origin: Element | undefined): Element | null {
  if (!origin) return null;

  const cached = peekState(origin)?.cachedBoundary;
  if (cached?.isConnected) {
    const config = peekState(cached)?.errorConfig;
    if (config && (config.boundary || config.fallback)) {
      return cached;
    }
  }

  let current: Element | null = origin;
  while (current) {
    const config = peekState(current)?.errorConfig;
    if (config && (config.boundary || config.fallback)) {
      const originState = peekState(origin);
      if (originState) originState.cachedBoundary = current;
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

/**
 * Resolves error config by walking up the DOM tree.
 * Returns first found config (including category-only configs).
 * @param origin The element where the error occurred
 * @returns The error config, or undefined if none found
 */
function resolveErrorConfig(origin: Element): ErrorConfig | undefined {
  let current: Element | null = origin;
  while (current) {
    const config = peekState(current)?.errorConfig;
    if (config) return config;
    current = current.parentElement;
  }
  return undefined;
}

/**
 * Tracks elements currently handling errors to prevent infinite loops.
 */
const handlingBoundaries = new WeakSet<Element>();

/**
 * Dispatches an error through the handler stack.
 * Handles boundary detection, infinite loop prevention, and reset functionality.
 * @param error The error that occurred
 * @param context The error context with phase, element, and event info
 * @returns Fallback flagged build fn to render, or null for no UI change
 */
function dispatchError(error: Error, context: ErrorContext): TemplateBuildFn | null {
  const boundary = findBoundary(context.element);

  if (boundary && handlingBoundaries.has(boundary)) {
    console.error("[dom] Error during error handling - preventing infinite loop:", error);
    return null;
  }

  if (boundary) {
    handlingBoundaries.add(boundary);
  }

  const state = boundary ? peekState(boundary) : undefined;
  const originalBuild = state?.originalBuild;
  let reset: (() => void) | undefined;
  if (originalBuild) {
    // Flagged template root: the reset target is the element's own build fn — re-invoke it
    // for fresh nodes (old children drain through the mount-target observer on removal).
    reset = () => {
      const build = peekState(boundary!)?.originalBuild;
      if (build) boundary!.replaceChildren(build());
    };
  }

  const contextWithReset = boundary ? { ...context, reset } : context;

  try {
    if (handlers.size === 0) {
      console.error("[dom]", error);
      return null;
    }

    const handlerArr = Array.from(handlers);
    let i = 0;
    const hLen = handlerArr.length;
    while (i < hLen) {
      const result = handlerArr[i++]!(error, contextWithReset);
      if (result) return result;
    }

    return null;
  } catch (e) {
    console.error("[dom] Error handler threw:", e);
    return null;
  } finally {
    if (boundary) {
      handlingBoundaries.delete(boundary);
    }
  }
}

/**
 * Clears all registered error handlers — the reset arm `resetDom()` dispatches to.
 */
function resetErrorState(): void {
  handlers.clear();
}

setErrorDispatch({ dispatchError, findBoundary, resolveErrorConfig, resetErrorState });
