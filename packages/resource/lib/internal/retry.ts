/**
 * Retry configuration normalization and the shared retry loop for the resource fetch pipeline.
 */
import type { ResourceError } from "../types/resource";
import { categorizeError, isAbortError } from "./errors";
import { raceAbort } from "./abort";

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
export function resolveRetryConfig(
  retry: number | boolean | ((failureCount: number, error: ResourceError) => boolean),
  retryDelay: number | ((attempt: number, error: ResourceError) => number)
): RetryConfig {
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
}

/**
 * @internal
 * Runs a request through the shared race-against-abort + retry loop: rejects with
 * the abort error when the signal fires (before or mid-request, or during a retry
 * delay), rejects with the final error once shouldRetry returns false, otherwise
 * retries after getDelay. The failure count passed to shouldRetry/getDelay starts
 * at 1 on the first failure. Per-caller post-processing (caching, state updates,
 * deferred settling) stays with the caller — the helper resolves the raw result.
 * @param start - Starts one fetch attempt; invoked fresh per attempt so each retry re-enters the fetcher
 * @param options.signal - This request's abort signal
 * @param options.retryConfig - Normalized shouldRetry/getDelay from resolveRetryConfig
 * @returns The raw result of the successful attempt
 */
export function fetchWithRetry<T>(
  start: () => Promise<T>,
  options: { signal: AbortSignal; retryConfig: RetryConfig }
): Promise<T> {
  const { signal, retryConfig } = options;

  return (async () => {
    let retryCount = 0;
    while (true) {
      if (signal.aborted) throw new DOMException("Request was aborted", "AbortError");
      try {
        return await raceAbort(start(), signal);
      } catch (err) {
        if (isAbortError(err)) throw err;
        retryCount++;
        const categorizedError = categorizeError(err);
        if (!retryConfig.shouldRetry(retryCount, categorizedError)) throw err;
        await new Promise<void>(resolve => {
          const timeoutId = setTimeout(() => resolve(), retryConfig.getDelay(retryCount, categorizedError));
          // Clear the delay timer if aborted during the wait; the top-of-loop check then exits.
          signal.addEventListener("abort", () => {
            clearTimeout(timeoutId);
            resolve();
          }, { once: true });
        });
      }
    }
  })();
}
