import type { ErrorContext, ErrorHandler } from './types/nodes';
import { handlers } from './internal/dispatch';

export type { ErrorContext, ErrorHandler };

/**
 * Registers a global error handler.
 * Multiple handlers can be registered - they execute in order, first non-null result wins.
 * @param fn Error handler function, or null to clear all handlers
 * @returns Remove function to unregister this handler
 */
export function onError(fn: ErrorHandler | null): () => void {
  if (fn === null) {
    handlers.clear();
    return () => { };
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
