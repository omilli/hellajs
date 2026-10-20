import type { HellaNode, ErrorConfig, ErrorContext, ErrorFn, HellaElement } from "../types/nodes";
import { setErrorDispatch, getMountNode } from "../internal/dispatch";
import { setMountBoundaryResolver } from "../internal/render";
import { isNull } from "../internal/core";
import { getState, peekState } from "../internal/state";

/**
 * @internal
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
 * @returns Fallback HellaNode to render, or null for no UI change
 */
function dispatchError(error: Error, context: ErrorContext): HellaNode | null {
  const boundary = findBoundary(context.element);

  if (boundary && handlingBoundaries.has(boundary)) {
    console.error("[dom] Error during error handling - preventing infinite loop:", error);
    return null;
  }

  if (boundary) {
    handlingBoundaries.add(boundary);
  }

  const originalNode = boundary ? peekState(boundary)?.originalNode : undefined;
  const reset = originalNode
    ? () => {
        const node = peekState(boundary!)?.originalNode;
        const mountNode = getMountNode();
        if (node && mountNode) {
          boundary!.replaceChildren(mountNode(node));
        }
      }
    : undefined;

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

/**
 * Applies one element's routed error config and resolves the boundary its
 * construction-time wiring dispatches against: the element itself when it carries an
 * error config, else the inherited boundary.
 * @param element The created element
 * @param routed The vnode's routed buckets (only `error` is read)
 * @param node The vnode (snapshotted as the reset target)
 * @param boundaryElement The inherited boundary, or undefined
 * @returns The boundary for this element's wiring
 */
function resolveMountBoundary(
  element: HellaElement,
  routed: { error: ErrorConfig | undefined },
  node: HellaNode,
  boundaryElement: Element | undefined,
): Element | undefined {
  if (routed.error) {
    const state = getState(element);
    state.errorConfig = routed.error;
    state.originalNode = node;
    return element;
  }
  return boundaryElement;
}

setErrorDispatch({ dispatchError, findBoundary, resolveErrorConfig, resetErrorState });
setMountBoundaryResolver(resolveMountBoundary);
