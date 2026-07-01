import { hasDocument } from "./core";
import { removeRule, upsertRule } from "./sheet";
import type { CSSVars, CSSVarsOptions } from "../types";

/**
 * @internal
 */
export const VARS_ID = "hella-vars";

/**
 * @internal
 */
export const scopedVarsRulesMap = new Map<string, Map<string, string>>();

/**
 * @internal
 */
export const cache = new Map<string, { flattened: Record<string, unknown>, result: unknown }>();

/**
 * @internal
 */
export const CACHE_MAX = 100;

/**
 * @internal
 */
export const DOT_REGEX = /\./g;

/**
 * Registry entry tracking a single cssVars() call's flat keys, scope,
 * prefix, reference count, and optional effect cleanup.
 */
interface VarsEntry {
  flatKeys: string[]
  scope: string
  prefix: string
  refCount: number
  cleanup?: () => void
}

/**
 * @internal
 */
export const varsRegistryStatic = new Map<string, VarsEntry>();

/**
 * Re-assignable via `let` — WeakMap cannot be cleared or enumerated, so
 * `resetReactiveRegistries()` swaps in a fresh instance on full reset.
 * @internal
 */
export let varsRegistryReactive = new WeakMap<object, VarsEntry>();

/**
 * Re-assignable via `let` — WeakMap cannot be cleared or enumerated, so
 * `resetReactiveRegistries()` swaps in a fresh instance on full reset.
 * @internal
 */
export let varsResultReactive = new WeakMap<object, CSSVars<Record<string, unknown>>>();

/**
 * @internal
 * Writes flattened variable declarations to the scoped rules map
 * and upserts the scope rule into the stylesheet.
 * `rawPrefix` is the raw `options.prefix`; the formatted `${p}-` form is derived here.
 */
export function applyRules(flat: Record<string, unknown>, { scoped, prefix: rawPrefix = "" }: CSSVarsOptions) {
  const scope = scoped || ":root";
  const fullPrefix = rawPrefix ? `${rawPrefix}-` : "";
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

  upsertRule(VARS_ID, scope, `${scope}{${serializeDecls(scopeMap)}}`);

  syncVarsTextContent();
}

/**
 * @internal
 * Removes the given flat variable keys from the scoped rules map
 * and updates the stylesheet. If the scope is now empty, the scope
 * rule is removed entirely.
 * `fullPrefix` is the pre-formatted prefix (already trailing-hyphen) stored on the registry entry.
 */
export function removeFromScope(scope: string, flatKeys: string[], fullPrefix: string): void {
  const scopeMap = scopedVarsRulesMap.get(scope);
  if (!scopeMap) return;

  let i = 0;
  const len = flatKeys.length;
  while (i < len) {
    scopeMap.delete(`${fullPrefix}${flatKeys[i++]}`);
  }

  if (scopeMap.size === 0) {
    scopedVarsRulesMap.delete(scope);
    removeRule(VARS_ID, scope);
  } else {
    upsertRule(VARS_ID, scope, `${scope}{${serializeDecls(scopeMap)}}`);
  }

  syncVarsTextContent();
}

/**
 * @internal
 * Resets reactive registries to new WeakMaps.
 */
export function resetReactiveRegistries(): void {
  varsRegistryReactive = new WeakMap();
  varsResultReactive = new WeakMap();
}

/**
 * @internal No-space CSSOM declaration form: `--k:v;--k2:v2`.
 */
function serializeDecls(scopeMap: Map<string, string>): string {
  const entries = Array.from(scopeMap.entries());
  let i = 0;
  const len = entries.length;
  let out = "";
  while (i < len) {
    const [k, v] = entries[i++]!;
    out += `--${k.replace(DOT_REGEX, "-")}:${v}`;
    if (i < len) out += ";";
  }
  return out;
}

/**
 * Mirrors the scoped vars rules into the style element's textContent
 * for DevTools visibility.
 */
function syncVarsTextContent() {
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
