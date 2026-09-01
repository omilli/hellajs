import type { ErrorFn } from "./types/nodes";
import { isNull } from "./internal/core";
import { handlers } from "./internal/dispatch";

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
