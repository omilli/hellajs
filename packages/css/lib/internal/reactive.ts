import { effect } from "./core";

/**
 * Effect cleanup functions for vars. Lazily allocated on first reactive use.
 */
let activeEffects: Set<() => void> | undefined;

/**
 * @internal
 * Creates a reactive effect for CSS variables.
 */
export function createVarsEffect(effectFn: () => void): () => void {
  activeEffects ??= new Set();
  const cleanup = effect(effectFn);
  activeEffects.add(cleanup);
  return () => {
    cleanup();
    activeEffects?.delete(cleanup);
  };
}

/**
 * @internal
 * Cleans up all active CSS variable effects.
 */
export function cleanupVarsEffects(): void {
  if (!activeEffects) return;
  const cleanups = Array.from(activeEffects);
  let i = 0;
  const len = cleanups.length;
  while (i < len) {
    const cleanup = cleanups[i++]!;
    cleanup();
  }
  activeEffects.clear();
}
