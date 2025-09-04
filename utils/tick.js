import { flush } from "../packages/core";

/**
 * Flushes effects synchronously and then waits for any microtasks (like CSS DOM updates) to complete.
 * This combines the synchronous effect processing of flush() with async DOM operations.
 * @returns {Promise<void>}
 */
export const tick = async () => {
  // First, process all pending effects synchronously
  flush();

  // Then wait for any microtasks (like CSS DOM updates) to complete
  return new Promise(resolve => {
    queueMicrotask(resolve);
  });
};