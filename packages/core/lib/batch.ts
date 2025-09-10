import { flush } from "./reactive";

export let batchDepth = 0;

/**
 * Executes a function while batching all signal updates within it.
 * Effects are deferred until the outermost batch operation completes.
 * @template T
 * @param batchFn The function to execute.
 * @returns The return value of the function.
 */
export function batch<T>(batchFn: () => T): T {
  ++batchDepth; // Increment nesting level
  try {
    return batchFn(); // Execute the batched function
  } finally {
    // Only process effects when exiting outermost batch
    if (!--batchDepth) flush();
  }
}