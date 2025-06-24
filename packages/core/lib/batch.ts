import { processQueue } from "./effect";

export let batchDepth = 0;

export function startBatch() {
  ++batchDepth;
}

export function endBatch() {
  if (!--batchDepth) {
    processQueue();
  }
}

export function batch<T>(fn: () => T): T {
  startBatch();
  try {
    return fn();
  } finally {
    endBatch();
  }
}