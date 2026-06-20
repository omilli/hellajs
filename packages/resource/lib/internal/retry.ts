/**
 * Retry configuration normalization for the resource fetch loop.
 */
import type { ResourceError } from "../types/resource";

/** Resolved retry configuration after normalizing the retry/retryDelay options. */
interface RetryConfig {
  maxRetries: number;
  shouldRetry: (count: number, error: ResourceError) => boolean;
  getDelay: (attempt: number, error: ResourceError) => number;
}

/**
 * @internal
 * Resolves retry/retryDelay options into a normalized config: max retries, a shouldRetry predicate, and a getDelay function.
 * @param retry - Number of attempts, boolean toggle, or custom predicate from ResourceOptions
 * @param retryDelay - Fixed delay in ms, or function returning delay based on attempt and error
 * @returns Normalized retry configuration
 */
export const resolveRetryConfig = (
  retry: number | boolean | ((failureCount: number, error: ResourceError) => boolean),
  retryDelay: number | ((attempt: number, error: ResourceError) => number)
): RetryConfig => {
  const maxRetries = typeof retry === "boolean"
    ? (retry ? 1 : 0)
    : (typeof retry === "number" ? retry : 0);
  return {
    maxRetries,
    shouldRetry: typeof retry === "function"
      ? retry
      : (count: number) => count <= maxRetries,
    getDelay: typeof retryDelay === "function"
      ? retryDelay
      : () => retryDelay
  };
};
