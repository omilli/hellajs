import type { CSSVarsOptions, CSSVars, CSSVarInputObject } from "./types";
import { hash, stringify } from "./internal/shared";
import { createVarsEffect } from "./internal/reactive";
import { hasDocument, isFunction, isPlainObject } from "./internal/core";
import { DOT_REGEX, cache, CACHE_MAX, varsRegistryStatic, varsRegistryReactive, varsResultReactive, applyRules } from "./internal/varsStore";

/**
 * Creates CSS custom properties (variables) from JavaScript objects with automatic reactivity support.
 *
 * On the client (DOM available): injects the custom properties into the CSSOM and returns a
 * same-shaped proxy of `var()` references. On the server (no DOM): returns the generated CSS
 * text directly (the custom-property declarations as a string), with zero state mutation and
 * no effects — the return type stays `CSSVars<T>` for client ergonomics; treat the server value
 * as `string` (narrow with `typeof` if reading it in isomorphic code).
 * @template T
 * @param vars Object containing CSS variable definitions. Can include nested objects and reactive signals.
 * @param options Configuration options for scoping and prefixing
 * @returns Proxy object with var() references on the client; CSS text on the server.
 * @throws {Error} When vars is not a plain object.
 * @throws {Error} When the same reactive vars object is registered a second time with differing scoped/prefix options.
 */
export function cssVars<T extends CSSVarInputObject>(vars: T, options: CSSVarsOptions = {}): CSSVars<T> {
  if (!isPlainObject(vars)) throw new Error(`[css] cssVars: expected a plain object, received ${String(vars)}`);

  const { flat, hasFns } = flattenVars(vars);

  if (!hasDocument()) {
    const scope = options.scoped || ":root";
    const prefix = options.prefix ? `${options.prefix}-` : "";
    const flatKeys = Object.keys(flat);
    let fi = 0;
    const fLen = flatKeys.length;
    let decls = "";
    while (fi < fLen) {
      const key = flatKeys[fi++] as string;
      const name = `${prefix}${key}`.replace(DOT_REGEX, "-");
      decls += `--${name}:${String(flat[key])}`;
      if (fi < fLen) decls += ";";
    }
    return `${scope}{${decls}}` as unknown as CSSVars<T>;
  }

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
    const scope = options.scoped || ":root";
    const prefix = options.prefix ? `${options.prefix}-` : "";
    if (scope !== existingEntry.scope || prefix !== existingEntry.prefix) {
      throw new Error(`[css] cssVars: reactive vars object already registered with different options (scoped/prefix); use a separate object per scope, received ${String(vars)}`);
    }
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
function buildResult<T extends CSSVarInputObject>(flat: Record<string, unknown>, options: CSSVarsOptions): CSSVars<T> {
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
