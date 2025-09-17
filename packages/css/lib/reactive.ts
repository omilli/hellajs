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
export function createCssVarsEffect(effectFn: () => void): () => void {
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
export function cleanupCssVarsEffects(): void {
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
export function deepTrackVars(obj: any, prefix = '', result: Record<string, any> = {}): Record<string, any> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return typeof obj === 'function' ? obj() : obj;
  }

  const keys = Object.keys(obj);
  let i = 0, l = keys.length;

  while (i < l) {
    const key = keys[i++];
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      deepTrackVars(value, newKey, result);
    } else {
      result[newKey] = typeof value === 'function' ? value() : value;
    }
  }
  return result;
}