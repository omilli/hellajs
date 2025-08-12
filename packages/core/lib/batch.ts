import { processQueue } from "./reactive";

export let batchDepth = 0;

/**
 * Executes a function while batching all signal updates within it.
 * Effects are deferred until the outermost batch operation completes.
 * @template T
 * @param fn The function to execute.
 * @returns The return value of the function.
 */
export function batch<T>(fn: () => T): T {
  ++batchDepth;
  try {
    return fn();
  } finally {
    if (!--batchDepth) processQueue();
  }
}