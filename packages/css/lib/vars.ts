import { stringify } from "./shared";
import { createCssVarsEffect, cleanupCssVarsEffects, deepTrackVars } from "./reactive";

/**
 * CSS variable rules storage.
 */
let varsRulesMap = new Map<string, string>();

/**
 * Gets or creates the CSS variables style element.
 * @returns The CSS variables style element.
 */
function styleElement(): HTMLStyleElement {
  if (!document.getElementById('hella-vars')) {
    let style = document.createElement('style');
    style.id = 'hella-vars';
    document.head.appendChild(style);
  }
  return document.getElementById('hella-vars') as HTMLStyleElement;
}

/**
 * Cache for CSS variables.
 */
const cache = new Map<string, { flattened: Record<string, any>, result: Record<string, string> }>();

/**
 * Creates CSS custom properties (variables) from JavaScript objects with automatic reactivity support.
 * @param vars - Object containing CSS variable definitions. Can include nested objects and reactive signals.
 * @returns Proxy object with var() references to the CSS custom properties
 */
export function cssVars(vars: Record<string, any>): any {
  // Check if vars contains any functions (reactive)
  const hasReactiveDeps = hasNestedFunctions(vars);

  if (!hasReactiveDeps) {
    // Static path - use existing logic
    const inputHash = hash(stringify(vars));
    const cached = cache.get(inputHash);
    if (cached) {
      applyRules(cached.flattened);
      return cached.result;
    }

    const flat = flattenVars(vars);
    applyRules(flat);
    const result = buildResult(flat);

    cache.size >= 100 && cache.clear();
    cache.set(inputHash, { flattened: flat, result });
    return result;
  }

  // Reactive path - create effect
  let result: any = {};

  createCssVarsEffect(() => {
    const flat = deepTrackVars(vars);
    applyRules(flat);
    result = buildResult(flat);
  });

  return result;
}

/**
 * Clears all CSS variables, caches, and reactive effects, resetting the CSS variables system to initial state.
 */
export function cssVarsReset() {
  cleanupCssVarsEffects();
  setRules(new Map());
  styleElement().textContent = '';
  cache.clear();
}

/**
 * Applies flattened CSS variable rules.
 * @param flat The flattened CSS variable rules.
 */
function applyRules(flat: Record<string, any>) {
  const entries = Object.entries(flat);
  let i = 0;
  const rules = new Map<string, string>();
  while (i < entries.length) {
    const [k, v] = entries[i++];
    rules.set(k, String(v));
  }
  setRules(rules);
}


/**
 * Flattens a nested object into a single-level object with dot-separated keys.
 * @param obj The object to flatten.
 * @param prefix The prefix for the keys.
 * @param result The object to store the flattened key-value pairs.
 * @returns The flattened object.
 */
function flattenVars(obj: any, prefix = '', result: Record<string, any> = {}): Record<string, any> {
  const keys = Object.keys(obj);
  let i = 0, l = keys.length;

  while (i < l) {
    const key = keys[i++];
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    value && typeof value === 'object' && !Array.isArray(value)
      ? flattenVars(value, newKey, result)
      : result[newKey] = value;
  }
  return result;
}

/**
 * Set CSS variable rules and update DOM.
 * @param rules The CSS variable rules to set.
 */
function setRules(rules: Map<string, string>): void {
  varsRulesMap = rules;
  if (varsRulesMap.size > 0) {
    let cssVars = '';
    const iterator = varsRulesMap.entries();
    let next = iterator.next();
    while (!next.done) {
      const [key, value] = next.value;
      cssVars += `--${key.replace(/\./g, '-')}: ${value};`;
      next = iterator.next();
    }
    styleElement().textContent = `:root{${cssVars}}`;
  } else {
    styleElement().textContent = '';
  }
}

/**
 * Creates a hash from a string.
 * @param str The string to hash.
 * @returns A hash string.
 */
/**
 * Checks if object has nested functions (reactive dependencies).
 */
function hasNestedFunctions(obj: any): boolean {
  if (typeof obj === 'function') return true;
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;

  const keys = Object.keys(obj);
  let i = 0, l = keys.length;
  while (i < l) {
    if (hasNestedFunctions(obj[keys[i++]])) return true;
  }
  return false;
}

/**
 * Builds result object from flattened vars.
 */
function buildResult(flat: Record<string, any>): any {
  const result: any = {};
  const flatKeys = Object.keys(flat);
  let i = 0, l = flatKeys.length;

  while (i < l) {
    const key = flatKeys[i++];
    const cssVarValue = `var(--${key.replace(/\./g, '-')})`;

    const keyParts = key.split('.');
    let current = result;
    let j = 0, kl = keyParts.length;

    while (j < kl - 1) {
      const part = keyParts[j++];
      current[part] = current[part] || {};
      current = current[part];
    }

    current[keyParts[keyParts.length - 1]] = cssVarValue;
  }

  return result;
}

function hash(str: string): string {
  let hash = 5381;
  const strLength = str.length;
  let i = strLength;
  while (i) hash = (hash * 33) ^ str.charCodeAt(--i);
  return (hash >>> 0).toString(36);
}
