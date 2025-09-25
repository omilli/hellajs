import { type CSSVarsOptions, type CSSVars } from "./types";
import { stringify } from "./shared";
import { varsEffect, cleanupVarsEffects, deepTrackVars } from "./reactive";

/**
 * CSS variable rules storage by scope.
 */
const scopedVarsRulesMap = new Map<string, Map<string, string>>();

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
const cache = new Map<string, { flattened: Record<string, unknown>, result: any }>();

/**
 * Creates CSS custom properties (variables) from JavaScript objects with automatic reactivity support.
 * @param vars - Object containing CSS variable definitions. Can include nested objects and reactive signals.
 * @param options - Configuration options for scoping and prefixing
 * @returns Proxy object with var() references to the CSS custom properties
 */
export function cssVars<T extends Record<string, unknown>>(vars: T, options?: CSSVarsOptions): CSSVars<T> {
  const opts = options || {};

  // Check if vars contains any functions (reactive)
  const hasReactiveDeps = hasNestedFunctions(vars);

  if (!hasReactiveDeps) {
    // Static path - use existing logic
    const inputHash = hash(stringify(vars) + stringify(opts));
    const cached = cache.get(inputHash);
    if (cached) {
      applyRules(cached.flattened, opts);
      return cached.result;
    }

    const flat = flattenVars(vars);
    applyRules(flat, opts);
    const result = buildResult<T>(flat, opts);

    cache.size >= 100 && cache.clear();
    cache.set(inputHash, { flattened: flat, result });
    return result;
  }

  // Reactive path - create effect
  let result = {} as CSSVars<T>;

  varsEffect(() => {
    const flat = deepTrackVars(vars);
    applyRules(flat, opts);
    result = buildResult<T>(flat, opts);
  });

  return result;
}

/**
 * Clears all CSS variables, caches, and reactive effects, resetting the CSS variables system to initial state.
 */
export function cssVarsReset() {
  cleanupVarsEffects();
  scopedVarsRulesMap.clear();
  styleElement().textContent = '';
  cache.clear();
}

/**
 * Applies flattened CSS variable rules.
 * @param flat The flattened CSS variable rules.
 * @param options The options containing scope and prefix.
 */
function applyRules(flat: Record<string, unknown>, options: CSSVarsOptions = {}) {
  const entries = Object.entries(flat);
  let i = 0;
  const rules = new Map<string, string>();
  const prefix = options.prefix ? `${options.prefix}-` : '';

  while (i < entries.length) {
    const [k, v] = entries[i++];
    const prefixedKey = prefix + k;
    rules.set(prefixedKey, String(v));
  }

  setRules(rules, options.scoped || ':root');
}

/**
 * Flattens a nested object into a single-level object with dot-separated keys.
 * @param obj The object to flatten.
 * @param prefix The prefix for the keys.
 * @param result The object to store the flattened key-value pairs.
 * @returns The flattened object.
 */
function flattenVars(obj: Record<string, unknown>, prefix = '', result: Record<string, unknown> = {}): Record<string, unknown> {
  const keys = Object.keys(obj);
  let i = 0, l = keys.length;

  while (i < l) {
    const key = keys[i++];
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    value && typeof value === 'object' && !Array.isArray(value)
      ? flattenVars(value as Record<string, unknown>, newKey, result)
      : result[newKey] = value;
  }
  return result;
}

/**
 * Set CSS variable rules for a specific scope and update DOM.
 * @param rules The CSS variable rules to set.
 * @param scope The scope selector for the CSS variables.
 */
function setRules(rules: Map<string, string>, scope: string): void {
  if (!scopedVarsRulesMap.has(scope)) {
    scopedVarsRulesMap.set(scope, new Map());
  }

  const scopeMap = scopedVarsRulesMap.get(scope)!;
  rules.forEach((value, key) => {
    scopeMap.set(key, value);
  });

  updateStyleElement();
}

/**
 * Updates the style element with all scoped CSS variables.
 */
function updateStyleElement(): void {
  let cssContent = '';

  scopedVarsRulesMap.forEach((rules, scope) => {
    if (rules.size > 0) {
      let cssVars = '';
      const iterator = rules.entries();
      let next = iterator.next();
      while (!next.done) {
        const [key, value] = next.value;
        cssVars += `--${key.replace(/\./g, '-')}: ${value};`;
        next = iterator.next();
      }
      cssContent += `${scope}{${cssVars}}`;
    }
  });

  styleElement().textContent = cssContent;
}

/**
 * Checks if object has nested functions (reactive dependencies).
 */
function hasNestedFunctions(obj: unknown): boolean {
  if (typeof obj === 'function') return true;
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;

  const keys = Object.keys(obj as Record<string, unknown>);
  let i = 0, l = keys.length;
  while (i < l) {
    if (hasNestedFunctions((obj as Record<string, unknown>)[keys[i++]])) return true;
  }
  return false;
}

/**
 * Builds result object from flattened vars with options.
 * @param flat The flattened variables.
 * @param options The options containing prefix.
 */
function buildResult<T extends Record<string, unknown>>(flat: Record<string, unknown>, options: CSSVarsOptions = {}): CSSVars<T> {
  const result: any = {};
  const flatKeys = Object.keys(flat);
  let i = 0, l = flatKeys.length;
  const prefix = options.prefix ? `${options.prefix}-` : '';

  while (i < l) {
    const key = flatKeys[i++];
    const prefixedKey = prefix + key;
    const cssVarValue = `var(--${prefixedKey.replace(/\./g, '-')})`;

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
