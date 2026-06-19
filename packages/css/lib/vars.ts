import type { CSSVarsOptions, CSSVars } from "./types";
import { stringify, hash } from "./shared";
import { createVarsEffect, cleanupVarsEffects } from "./reactive";
import { upsertRule, removeRule, resetSheet } from "./sheet";
import { isFunction, isPlainObject, hasDocument } from "./internal/core";

const VARS_ID = "hella-vars";

/**
 * CSS variable rules storage by scope.
 */
const scopedVarsRulesMap = new Map<string, Map<string, string>>();

/**
 * Cache for CSS variables.
 */
const cache = new Map<string, { flattened: Record<string, unknown>, result: unknown }>();

const CACHE_MAX = 100;

const DOT_REGEX = /\./g;

/**
 * Registry entry tracking a single cssVars() call"s flat keys, scope,
 * prefix, reference count, and optional effect cleanup.
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
export function cssVars<T extends Record<string, unknown>>(vars: T, options: CSSVarsOptions = {}): CSSVars<T> {
  if (!isPlainObject(vars)) throw new Error(`[css] cssVars: expected a plain object, received ${String(vars)}`);

  const { flat, hasFns } = flattenVars(vars);

  if (!hasFns) {
    const inputHash = hash(stringify(vars) + stringify(options));
    const cached = cache.get(inputHash);
    if (cached) {
      cache.delete(inputHash);
      cache.set(inputHash, cached);
      const entry = varsRegistryStatic.get(inputHash);
      if (entry) entry.refCount++;
      applyRules(cached.flattened, options);
      return cached.result as CSSVars<T>;
    }

    applyRules(flat, options);
    const result = buildResult<T>(flat, options);

    if (cache.size >= CACHE_MAX) {
      const oldest = cache.keys().next().value as string;
      cache.delete(oldest);
    }
    cache.set(inputHash, { flattened: flat, result });
    varsRegistryStatic.set(inputHash, {
      flatKeys: Object.keys(flat),
      scope: options.scoped || ":root",
      prefix: options.prefix ? `${options.prefix}-` : "",
      refCount: 1,
    });
    return result;
  }

  const existingEntry = varsRegistryReactive.get(vars);
  if (existingEntry) {
    existingEntry.refCount++;
    applyRules(flat, options);
    return varsResultReactive.get(vars) as CSSVars<T>;
  }

  applyRules(flat, options);
  const result = buildResult<T>(flat, options);

  const run = () => {
    const { flat } = flattenVars(vars);
    applyRules(flat, options);
  };

  const cleanup = createVarsEffect(run);

  varsRegistryReactive.set(vars, {
    flatKeys: Object.keys(flat),
    scope: options.scoped || ":root",
    prefix: options.prefix ? `${options.prefix}-` : "",
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
export function cssVarsRemove<T extends Record<string, unknown>>(vars: T, options: CSSVarsOptions = {}): void {
  if (!isPlainObject(vars)) throw new Error(`[css] cssVarsRemove: expected a plain object, received ${String(vars)}`);

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

  const inputHash = hash(stringify(vars) + stringify(options));
  const staticEntry = varsRegistryStatic.get(inputHash);
  if (!staticEntry) return;

  staticEntry.refCount--;
  if (staticEntry.refCount > 0) return;

  cache.delete(inputHash);
  removeFromScope(staticEntry.scope, staticEntry.flatKeys, staticEntry.prefix);
  varsRegistryStatic.delete(inputHash);
}

/**
 * Removes the given flat variable keys from the scoped rules map
 * and updates the stylesheet. If the scope is now empty, the scope
 * rule is removed entirely.
 */
function removeFromScope(scope: string, flatKeys: string[], prefix: string): void {
  const scopeMap = scopedVarsRulesMap.get(scope);
  if (!scopeMap) return;

  let i = 0;
  const len = flatKeys.length;
  while (i < len) {
    scopeMap.delete(`${prefix}${flatKeys[i++]}`);
  }

  if (scopeMap.size === 0) {
    scopedVarsRulesMap.delete(scope);
    removeRule(VARS_ID, scope);
  } else {
    const fullScopeVars = Array.from(scopeMap.entries())
      .map(([k, v]) => `--${k.replace(DOT_REGEX, "-")}:${v}`)
      .join(";");
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
 * Writes flattened variable declarations to the scoped rules map
 * and upserts the scope rule into the stylesheet.
 */
function applyRules(flat: Record<string, unknown>, { scoped, prefix = "" }: CSSVarsOptions) {
  const scope = scoped || ":root";
  const fullPrefix = prefix ? `${prefix}-` : "";
  const entries = Object.entries(flat);
  const len = entries.length;

  if (!scopedVarsRulesMap.has(scope)) {
    scopedVarsRulesMap.set(scope, new Map());
  }

  const scopeMap = scopedVarsRulesMap.get(scope)!;
  let i = 0;
  while (i < len) {
    const [k, v] = entries[i++] as [string, unknown];
    scopeMap.set(`${fullPrefix}${k}`, String(v));
  }

  const fullScopeVars = Array.from(scopeMap.entries())
    .map(([k, v]) => `--${k.replace(DOT_REGEX, "-")}:${v}`)
    .join(";");

  upsertRule(VARS_ID, scope, `${scope}{${fullScopeVars}}`);

  // Sync textContent from data so tests and DevTools see consistent format
  syncTextContent();
}

/**
 * Mirrors the scoped vars rules into the style element"s textContent
 * for DevTools visibility.
 */
function syncTextContent() {
  let text = "";

  const scopeEntries = Array.from(scopedVarsRulesMap.entries());
  let i = 0;
  const len = scopeEntries.length;
  while (i < len) {
    const [scope, rules] = scopeEntries[i++] as [string, Map<string, string>];
    if (rules.size === 0) continue;

    let vars = "";
    const iterator = rules.entries();
    let next = iterator.next();
    while (!next.done) {
      const [k, v] = next.value;
      vars += `--${k.replace(DOT_REGEX, "-")}: ${v};`;
      next = iterator.next();
    }
    text += `${scope}{${vars}}`;
  }

  if (!hasDocument()) return;
  const el = document.getElementById(VARS_ID) as HTMLStyleElement | null;
  if (el) el.textContent = text;
}

/**
 * Single-pass flatten that converts nested objects to dot-separated keys
 * and resolves function values. Returns a flat map and a flag indicating
 * whether any reactive functions were found.
 */
function flattenVars(obj: Record<string, unknown>, prefix = "", result: { flat: Record<string, unknown>; hasFns: boolean } = { flat: {}, hasFns: false }): { flat: Record<string, unknown>; hasFns: boolean } {
  const keys = Object.keys(obj);
  let i = 0;
  const len = keys.length;

  while (i < len) {
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
 * Builds the result proxy object with var() references from flattened vars.
 * Reconstructs nested structure using dot-separated keys.
 */
function buildResult<T extends Record<string, unknown>>(flat: Record<string, unknown>, options: CSSVarsOptions): CSSVars<T> {
  const result: Record<string, unknown> = {};
  const flatKeys = Object.keys(flat);
  let i = 0;
  const len = flatKeys.length;
  const prefix = options.prefix ? `${options.prefix}-` : "";

  while (i < len) {
    const key = flatKeys[i++] as string;
    const prefixedKey = prefix + key;
    const cssVarValue = `var(--${prefixedKey.replace(DOT_REGEX, "-")})`;

    const keyParts = key.split(".");
    let current = result as Record<string, unknown>;
    let ki = 0;
    const kLen = keyParts.length;

    while (ki < kLen - 1) {
      const part = keyParts[ki++] as string;
      current[part] = current[part] || {};
      current = current[part] as Record<string, unknown>;
    }

    current[keyParts[keyParts.length - 1] as string] = cssVarValue;
  }

  return result as CSSVars<T>;
}
