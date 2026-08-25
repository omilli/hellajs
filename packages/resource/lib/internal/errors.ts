/**
 * Error classification helpers shared across the resource fetch pipeline.
 */
import type { ResourceError } from "../types/resource";

/**
 * @internal
 * Type guard checking whether a value is a DOMException named AbortError.
 * @param err - Value caught from a fetch or mutation
 */
export function isAbortError(err: unknown): err is DOMException {
  return err instanceof DOMException && err.name === "AbortError";
}

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

  let category: ResourceError["category"] = "unknown";
  if (isAbortError(error)) {
    category = "abort";
  } else if (statusCode === 404) {
    category = "not_found";
  } else if (statusCode && statusCode >= 500) {
    category = "server";
  } else if (statusCode && statusCode >= 400) {
    category = "client";
  }

  return {
    message,
    category,
    ...(statusCode && { statusCode }),
    originalError: error
  };
}
