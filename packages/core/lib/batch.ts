import { processQueue } from "./reactive";

export let batchDepth = 0;

export function batch<T>(fn: () => T): T {
  ++batchDepth;
  try {
    return fn();
  } finally {
    if (!--batchDepth) processQueue();
  }
}