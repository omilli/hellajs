import { flush } from "./internal/scheduler";
import { isFunction } from "./internal/utils";

/**
 * @internal Nesting depth of active `batch()` calls; incremented on entry, decremented on exit. Flush runs when depth reaches zero.
 */
export let batchDepth = 0;

/**
 * Executes a function while batching all signal updates within it.
 * Effects are deferred until the outermost batch operation completes.
 * @template T
 * @param batchFn The function to execute.
 * @returns The return value of the function.
 */
export function batch<T>(batchFn: () => T): T {
  if (!isFunction(batchFn)) {
    throw new Error(`[core] batch: batchFn must be a function, received ${typeof batchFn}`);
  }
  ++batchDepth;
  try {
    return batchFn();
  } finally {
    if (!--batchDepth) flush();
  }
}
