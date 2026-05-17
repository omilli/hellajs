import type { CSSVarsOptions, CSSVars } from "./types";
import { stringify, hash } from "./shared";
import { varsEffect, cleanupVarsEffects, deepTrackVars } from "./reactive";
import { upsertRule, resetSheet } from "./sheet";

const VARS_ID = 'hella-vars';

/**
 * CSS variable rules storage by scope.
 */
const scopedVarsRulesMap = new Map<string, Map<string, string>>();

/**
 * Cache for CSS variables.
 */
const cache = new Map<string, { flattened: Record<string, unknown>, result: unknown }>();

/**
 * Creates CSS custom properties (variables) from JavaScript objects with automatic reactivity support.
 * @template T
 * @param vars Object containing CSS variable definitions. Can include nested objects and reactive signals.
 * @param options Configuration options for scoping and prefixing
 * @returns Proxy object with var() references to the CSS custom properties
 */
export function cssVars<T extends Record<string, unknown>>(vars: T, options?: CSSVarsOptions): CSSVars<T> {
  const opts = options || {};

  // Check if vars contains any functions (reactive)
  const hasReactiveDeps = hasNestedFunctions(vars);

  if (!hasReactiveDeps) {
    // Static path — use caching
    const inputHash = hash(stringify(vars) + stringify(opts));
    const cached = cache.get(inputHash);
    if (cached) {
      applyRules(cached.flattened, opts);
      return cached.result as CSSVars<T>;
    }

    const flat = flattenVars(vars);
    applyRules(flat, opts);
    const result = buildResult<T>(flat, opts);

    cache.size >= 100 && cache.clear();
    cache.set(inputHash, { flattened: flat, result });
    return result;
  }

  // Reactive path — synchronous first run, then reactive updates
  let result = {} as CSSVars<T>;

  const run = () => {
    const flat = deepTrackVars(vars);
    applyRules(flat, opts);
    result = buildResult<T>(flat, opts);
  };

  run();
  varsEffect(run);

  return result;
}

/**
 * Clears all CSS variables, caches, and reactive effects, resetting the CSS variables system to initial state.
 */
export function cssVarsReset() {
  cleanupVarsEffects();
  scopedVarsRulesMap.clear();
  resetSheet(VARS_ID);
  cache.clear();
}

/**
 * Applies flattened CSS variable rules for a scope via CSSOM.
 */
function applyRules(flat: Record<string, unknown>, options: CSSVarsOptions = {}) {
  const scope = options.scoped || ':root';
  const prefix = options.prefix ? `${options.prefix}-` : '';
  const entries = Object.entries(flat);

  // Build var declarations for this scope
  let cssVars = '';
  let i = 0;
  const l = entries.length;

  while (i < l) {
    const [k, v] = entries[i++];
    cssVars += `--${prefix}${k.replace(/\./g, '-')}: ${v};`;
  }

  // Merge into scoped data
  if (!scopedVarsRulesMap.has(scope)) {
    scopedVarsRulesMap.set(scope, new Map());
  }

  const scopeMap = scopedVarsRulesMap.get(scope)!;
  i = 0;
  while (i < l) {
    const [k, v] = entries[i++];
    scopeMap.set(`${prefix}${k}`, String(v));
  }

  // Rebuild the full scope rule from accumulated data and upsert via CSSOM
  const fullScopeVars = Array.from(scopeMap.entries())
    .map(([k, v]) => `--${k.replace(/\./g, '-')}:${v}`)
    .join(';');

  upsertRule(VARS_ID, scope, `${scope}{${fullScopeVars}}`);

  // Sync textContent from data so tests and DevTools see consistent format
  syncTextContent();
}

/**
 * Rebuild textContent from scopedVarsRulesMap in compact format.
 */
function syncTextContent() {
  let text = '';

  for (const [scope, rules] of scopedVarsRulesMap) {
    if (rules.size === 0) continue;

    let vars = '';
    const iterator = rules.entries();
    let next = iterator.next();
    while (!next.done) {
      const [k, v] = next.value;
      vars += `--${k.replace(/\./g, '-')}: ${v};`;
      next = iterator.next();
    }
    text += `${scope}{${vars}}`;
  }

  const el = document.getElementById(VARS_ID) as HTMLStyleElement | null;
  if (el) el.textContent = text;
}

/**
 * Flattens a nested object into a single-level object with dot-separated keys.
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
 */
function buildResult<T extends Record<string, unknown>>(flat: Record<string, unknown>, options: CSSVarsOptions = {}): CSSVars<T> {
  const result: Record<string, unknown> = {};
  const flatKeys = Object.keys(flat);
  let i = 0, l = flatKeys.length;
  const prefix = options.prefix ? `${options.prefix}-` : '';

  while (i < l) {
    const key = flatKeys[i++];
    const prefixedKey = prefix + key;
    const cssVarValue = `var(--${prefixedKey.replace(/\./g, '-')})`;

    const keyParts = key.split('.');
    let current = result as Record<string, unknown>;
    let j = 0, kl = keyParts.length;

    while (j < kl - 1) {
      const part = keyParts[j++];
      current[part] = current[part] || {};
      current = current[part] as Record<string, unknown>;
    }

    current[keyParts[keyParts.length - 1]] = cssVarValue;
  }

  return result as CSSVars<T>;
}
