import { effect } from "./internal/core";

/**
 * Effect cleanup functions for cssVars.
 */
const activeEffects = new Set<() => void>();

/**
 * @internal
 * Creates a reactive effect for CSS variables.
 */
export function varsEffect(effectFn: () => void): () => void {
  const cleanup = effect(effectFn);
  activeEffects.add(cleanup);
  return () => {
    cleanup();
    activeEffects.delete(cleanup);
  };
}

/**
 * @internal
 * Cleans up all active CSS variable effects.
 */
export function cleanupVarsEffects(): void {
  for (const cleanup of activeEffects) {
    cleanup();
  }
  activeEffects.clear();
}

