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
 */
export function applyRules(flat: Record<string, unknown>, { scoped, prefix = "" }: CSSVarsOptions) {
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

  syncTextContent();
}

/**
 * @internal
 * Removes the given flat variable keys from the scoped rules map
 * and updates the stylesheet. If the scope is now empty, the scope
 * rule is removed entirely.
 */
export function removeFromScope(scope: string, flatKeys: string[], prefix: string): void {
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
 * @internal
 * Resets reactive registries to new WeakMaps.
 */
export function resetReactiveRegistries(): void {
  varsRegistryReactive = new WeakMap();
  varsResultReactive = new WeakMap();
}

/**
 * Mirrors the scoped vars rules into the style element's textContent
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
