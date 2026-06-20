/**
 * Error classification helpers shared across the resource fetch pipeline.
 */
import type { ResourceError } from "../types/resource";

/**
 * @internal
 * Type guard checking whether a value is a DOMException named AbortError.
 * @param err - Value caught from a fetch or mutation
 */
export const isAbortError = (err: unknown): err is DOMException =>
  err instanceof DOMException && err.name === "AbortError";

/**
 * @internal
 * Categorizes errors into structured ResourceError format.
 * @param error - Raw error from fetch or other operations
 * @returns Categorized error with message, category, and optional status code
 */
export function categorizeError(error: unknown): ResourceError {
  const message = isAbortError(error)
    ? "Request was aborted"
    : error instanceof Error ? error.message : String(error);

  const statusMatch = error instanceof Error ? error.message.match(/^HTTP (\d+):/) : null;
  const statusCode = statusMatch ? parseInt(statusMatch[1]!, 10) : undefined;

  const category = isAbortError(error) ? "abort"
    : statusCode === 404 ? "not_found"
      : statusCode && statusCode >= 500 ? "server"
        : statusCode && statusCode >= 400 ? "client"
          : "unknown";

  return {
    message,
    category,
    ...(statusCode && { statusCode }),
    originalError: error
  };
}
