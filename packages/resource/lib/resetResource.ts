import { resetCacheState } from "./cache";
import { resetDedupe } from "./internal/dedupe";

/**
 * Factory-resets all resource package mutable state.
 * Clears the cache map, online callbacks, cleanup throttle, and deduplication map.
 * A real-world nuke for logout, HMR, session reset, error recovery, and testing.
 */
export function resetResource(): void {
  resetCacheState();
  resetDedupe();
}