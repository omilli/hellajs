import { effect } from "@hellajs/core";

/**
 * Effect cleanup functions for cssVars.
 */
const activeEffects = new Set<() => void>();

/**
 * Creates a reactive effect for CSS variables.
 * @param effectFn The effect function to run.
 * @returns Cleanup function.
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
 * Cleans up all active CSS variable effects.
 */
export function cleanupVarsEffects(): void {
  for (const cleanup of activeEffects) {
    cleanup();
  }
  activeEffects.clear();
}

/**
 * Deep traverses an object and calls any function values to establish reactive dependencies.
 * @param obj The object to traverse.
 * @param prefix Current key prefix for flattening.
 * @param result Accumulator for flattened result.
 * @returns Flattened object with resolved function values.
 */
export function deepTrackVars(obj: unknown, prefix = '', result: Record<string, unknown> = {}): Record<string, unknown> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return typeof obj === 'function' ? obj() : obj as Record<string, unknown>;
  }

  const keys = Object.keys(obj as Record<string, unknown>);
  let i = 0, l = keys.length;

  while (i < l) {
    const key = keys[i++];
    const value = (obj as Record<string, unknown>)[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      deepTrackVars(value, newKey, result);
    } else {
      result[newKey] = typeof value === 'function' ? value() : value;
    }
  }
  return result;
}