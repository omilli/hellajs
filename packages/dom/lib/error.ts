import type { ErrorHandler } from './types/nodes';
import { handlers } from './internal/dispatch';

const NOOP = () => {};

/**
 * Registers a global error handler.
 * Multiple handlers can be registered - they execute in order, first non-null result wins.
 * @param fn Error handler function, or null to clear all handlers
 * @returns Remove function to unregister this handler
 */
export function onError(fn: ErrorHandler | null): () => void {
  if (fn === null) {
    handlers.clear();
    return NOOP;
  }
  handlers.add(fn);
  return () => handlers.delete(fn);
}
