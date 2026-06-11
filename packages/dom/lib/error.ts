/**
 * Global error handling system with element-level configuration.
 * Supports stacked handlers (first non-null wins), boundary caching, and reset functionality.
 * @module error
 */

import type { HellaNode, ErrorConfig, ErrorContext, ErrorHandler } from './types/nodes';
import { getState, hasState, peekState } from './internal/element-map';

export type { ErrorConfig, ErrorContext, ErrorHandler };

const handlers = new Set<ErrorHandler>();
const handlingBoundaries = new WeakSet<Element>();
let mountNodeFn: ((node: HellaNode) => Node) | null = null;

/**
 * Registers the mountNode function from mount.ts.
 * Called once during module initialization to enable reset functionality.
 * @param fn The mountNode function
 */
export function setMountNode(fn: (node: HellaNode) => Node): void {
  mountNodeFn = fn;
}

/**
 * Returns the registered mountNode function.
 * Used by events.ts and direct-events.ts to render fallback UI.
 */
export function getMountNode(): ((node: HellaNode) => Node) | null {
  return mountNodeFn;
}

/**
 * Registers a global error handler.
 * Multiple handlers can be registered - they execute in order, first non-null result wins.
 * @param fn Error handler function, or null to clear all handlers
 * @returns Remove function to unregister this handler
 */
export function onError(fn: ErrorHandler | null): () => void {
  if (fn === null) {
    handlers.clear();
    return () => {};
  }
  handlers.add(fn);
  return () => handlers.delete(fn);
}

/**
 * Removes all registered error handlers.
 */
export function clearErrorHandlers(): void {
  handlers.clear();
}

/**
 * Normalizes any thrown value to an Error object.
 * @param e The thrown value
 * @returns Error object
 */
export function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

/**
 * Finds the nearest error boundary element by walking up the DOM tree.
 * Caches result on the origin element for O(1) subsequent lookups.
 * @param origin The element where the error occurred
 * @returns The boundary element, or null if none found
 */
export function findBoundary(origin: Element | undefined): Element | null {
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
      if (hasState(origin)) {
        getState(origin).cachedBoundary = current;
      }
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
export function resolveErrorConfig(origin: Element): ErrorConfig | undefined {
  let current: Element | null = origin;
  while (current) {
    const config = peekState(current)?.errorConfig;
    if (config) return config;
    current = current.parentElement;
  }
  return undefined;
}

/**
 * Dispatches an error through the handler stack.
 * Handles boundary detection, infinite loop prevention, and reset functionality.
 * @param error The error that occurred
 * @param context The error context with phase, element, and event info
 * @returns Fallback HellaNode to render, or null for no UI change
 */
export function dispatchError(error: Error, context: ErrorContext): HellaNode | null {
  const boundary = findBoundary(context.element);

  if (boundary && handlingBoundaries.has(boundary)) {
    console.error('[dom] Error during error handling - preventing infinite loop:', error);
    return null;
  }

  if (boundary) {
    handlingBoundaries.add(boundary);
  }

  const originalNode = boundary ? peekState(boundary)?.originalNode : undefined;
  const reset = originalNode
    ? () => {
        const node = peekState(boundary!)?.originalNode;
        if (node && mountNodeFn) {
          boundary!.replaceChildren(mountNodeFn(node));
        }
      }
    : undefined;

  const contextWithReset = boundary ? { ...context, reset } : context;

  try {
    if (handlers.size === 0) {
      console.error('[dom]', error);
      return null;
    }

    for (const handler of handlers) {
      const result = handler(error, contextWithReset);
      if (result) return result;
    }

    return null;
  } catch (e) {
    console.error('[dom] Error handler threw:', e);
    return null;
  } finally {
    if (boundary) {
      handlingBoundaries.delete(boundary);
    }
  }
}
