import type { CSSVarsOptions, CSSVars } from "./types";
import { stringify, hash } from "./shared";
import { varsEffect, cleanupVarsEffects } from "./reactive";
import { upsertRule, removeRule, resetSheet } from "./sheet";
import { isFunction, isPlainObject } from "./internal/core";

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
 * @internal
 */
interface VarsEntry {
  flatKeys: string[]
  scope: string
  prefix: string
  refCount: number
  cleanup?: () => void
}

const varsRegistryStatic = new Map<string, VarsEntry>();
let varsRegistryReactive = new WeakMap<object, VarsEntry>();
let varsResultReactive = new WeakMap<object, CSSVars<Record<string, unknown>>>();

/**
 * Creates CSS custom properties (variables) from JavaScript objects with automatic reactivity support.
 * @template T
 * @param vars Object containing CSS variable definitions. Can include nested objects and reactive signals.
 * @param options Configuration options for scoping and prefixing
 * @returns Proxy object with var() references to the CSS custom properties
 */
export function cssVars<T extends Record<string, unknown>>(vars: T, options?: CSSVarsOptions): CSSVars<T> {
  const opts = options || {};

  const { flat, hasFns } = flattenVars(vars);

  if (!hasFns) {
    const inputHash = hash(stringify(vars) + stringify(opts));
    const cached = cache.get(inputHash);
    if (cached) {
      const entry = varsRegistryStatic.get(inputHash);
      if (entry) entry.refCount++;
      applyRules(cached.flattened, opts);
      return cached.result as CSSVars<T>;
    }

    applyRules(flat, opts);
    const result = buildResult<T>(flat, opts);

    cache.size >= 100 && cache.clear();
    cache.set(inputHash, { flattened: flat, result });
    varsRegistryStatic.set(inputHash, {
      flatKeys: Object.keys(flat),
      scope: opts.scoped || ':root',
      prefix: opts.prefix ? `${opts.prefix}-` : '',
      refCount: 1,
    });
    return result;
  }

  const existingEntry = varsRegistryReactive.get(vars);
  if (existingEntry) {
    existingEntry.refCount++;
    applyRules(flat, opts);
    return varsResultReactive.get(vars) as CSSVars<T>;
  }

  applyRules(flat, opts);
  const result = buildResult<T>(flat, opts);

  const run = () => {
    const { flat } = flattenVars(vars);
    applyRules(flat, opts);
  };

  const cleanup = varsEffect(run);

  varsRegistryReactive.set(vars, {
    flatKeys: Object.keys(flat),
    scope: opts.scoped || ':root',
    prefix: opts.prefix ? `${opts.prefix}-` : '',
    refCount: 1,
    cleanup,
  });
  varsResultReactive.set(vars, result);

  return result;
}

/**
 * Removes CSS custom properties by decrementing the reference count.
 * The variables are removed from the stylesheet only when the reference count reaches zero.
 * @template T
 * @param vars Object containing CSS variable definitions (must match the object passed to cssVars)
 * @param options Configuration options (must match the options used in cssVars)
 */
export function cssVarsRemove<T extends Record<string, unknown>>(vars: T, options?: CSSVarsOptions): void {
  const opts = options || {};

  const reactiveEntry = varsRegistryReactive.get(vars);
  if (reactiveEntry) {
    reactiveEntry.refCount--;
    if (reactiveEntry.refCount > 0) return;

    if (reactiveEntry.cleanup) reactiveEntry.cleanup();
    removeFromScope(reactiveEntry.scope, reactiveEntry.flatKeys, reactiveEntry.prefix);
    varsRegistryReactive.delete(vars);
    varsResultReactive.delete(vars);
    return;
  }

  const inputHash = hash(stringify(vars) + stringify(opts));
  const staticEntry = varsRegistryStatic.get(inputHash);
  if (!staticEntry) return;

  staticEntry.refCount--;
  if (staticEntry.refCount > 0) return;

  cache.delete(inputHash);
  removeFromScope(staticEntry.scope, staticEntry.flatKeys, staticEntry.prefix);
  varsRegistryStatic.delete(inputHash);
}

/**
 * @internal
 */
function removeFromScope(scope: string, flatKeys: string[], prefix: string): void {
  const scopeMap = scopedVarsRulesMap.get(scope);
  if (!scopeMap) return;

  let i = 0;
  const l = flatKeys.length;
  while (i < l) {
    scopeMap.delete(`${prefix}${flatKeys[i++]}`);
  }

  if (scopeMap.size === 0) {
    scopedVarsRulesMap.delete(scope);
    removeRule(VARS_ID, scope);
  } else {
    const fullScopeVars = Array.from(scopeMap.entries())
      .map(([k, v]) => `--${k.replace(/\./g, '-')}:${v}`)
      .join(';');
    upsertRule(VARS_ID, scope, `${scope}{${fullScopeVars}}`);
  }

  syncTextContent();
}

/**
 * Clears all CSS variables, caches, and reactive effects, resetting the CSS variables system to initial state.
 */
export function cssVarsReset() {
  cleanupVarsEffects();
  scopedVarsRulesMap.clear();
  resetSheet(VARS_ID);
  cache.clear();
  varsRegistryStatic.clear();
  varsRegistryReactive = new WeakMap();
  varsResultReactive = new WeakMap();
}

/**
 * Applies flattened CSS variable rules for a scope via CSSOM.
 */
function applyRules(flat: Record<string, unknown>, options: CSSVarsOptions = {}) {
  const scope = options.scoped || ':root';
  const prefix = options.prefix ? `${options.prefix}-` : '';
  const entries = Object.entries(flat);

  // Build var declarations for this scope
  let i: number;
  const l = entries.length;

  // Merge into scoped data
  if (!scopedVarsRulesMap.has(scope)) {
    scopedVarsRulesMap.set(scope, new Map());
  }

  const scopeMap = scopedVarsRulesMap.get(scope)!;
  i = 0;
  while (i < l) {
    const [k, v] = entries[i++] as [string, unknown];
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
 * Single-pass flatten that returns both the flat map and whether any functions were found.
 */
function flattenVars(obj: Record<string, unknown>, prefix = '', result: { flat: Record<string, unknown>; hasFns: boolean } = { flat: {}, hasFns: false }): { flat: Record<string, unknown>; hasFns: boolean } {
  const keys = Object.keys(obj);
  let i = 0;
  const l = keys.length;

  while (i < l) {
    const key = keys[i++] as string;
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && isPlainObject(value)) {
      flattenVars(value as Record<string, unknown>, newKey, result);
    } else {
      result.hasFns ||= isFunction(value);
      result.flat[newKey] = isFunction(value) ? value() : value;
    }
  }
  return result;
}

/**
 * Builds result object from flattened vars with options.
 */
function buildResult<T extends Record<string, unknown>>(flat: Record<string, unknown>, options: CSSVarsOptions = {}): CSSVars<T> {
  const result: Record<string, unknown> = {};
  const flatKeys = Object.keys(flat);
  let i = 0;
  const l = flatKeys.length;
  const prefix = options.prefix ? `${options.prefix}-` : '';

  while (i < l) {
    const key = flatKeys[i++] as string;
    const prefixedKey = prefix + key;
    const cssVarValue = `var(--${prefixedKey.replace(/\./g, '-')})`;

    const keyParts = key.split('.');
    let current = result as Record<string, unknown>;
    let j = 0;
    const kl = keyParts.length;

    while (j < kl - 1) {
      const part = keyParts[j++] as string;
      current[part] = current[part] || {};
      current = current[part] as Record<string, unknown>;
    }

    current[keyParts[keyParts.length - 1] as string] = cssVarValue;
  }

  return result as CSSVars<T>;
}
