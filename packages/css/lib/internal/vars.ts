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
 * resolved prefix (trailing hyphen included), resolved media condition,
 * reference count, and optional effect cleanup.
 */
interface VarsEntry {
  flatKeys: string[];
  scope: string;
  fullPrefix: string;
  media: string;
  refCount: number;
  cleanup?: () => void;
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
 * CSSVarsOptions in emitted form: scope default resolved, prefix
 * trailing-hyphenated, media normalized to `""` when absent.
 */
interface ResolvedVarsOptions {
  scope: string;
  fullPrefix: string;
  media: string;
}

/**
 * @internal
 * Resolves CSSVarsOptions once: scope falls back to `:root`, the raw prefix
 * gains its trailing hyphen, media normalizes to `""`. Every cssVars path
 * derives scope/prefix/media through this — the single definition (no
 * per-site duplication to drift).
 */
export function resolveVarsOptions({ scoped, prefix: rawPrefix = "", media }: CSSVarsOptions): ResolvedVarsOptions {
  return {
    scope: scoped || ":root",
    fullPrefix: rawPrefix ? `${rawPrefix}-` : "",
    media: media || "",
  };
}

/**
 * Composite bucket/rule key for one scope+media pair — the same scope under
 * different media conditions coexists as separate buckets.
 */
function varsBucketKey(scope: string, media: string): string {
  return `${media ? `@media ${media}` : ""}|${scope}`;
}

/**
 * @internal
 * Full rule text for one scope+media bucket: declarations wrapped in the
 * scope selector, then in the media at-rule when present.
 */
export function varsRuleText(scope: string, media: string, decls: string): string {
  return `${media ? `@media ${media}{` : ""}${scope}{${decls}}${media ? "}" : ""}`;
}

/**
 * @internal
 * Writes flattened variable declarations to the scoped rules map
 * and upserts the scope rule into the stylesheet.
 * Takes the pre-resolved options from `resolveVarsOptions`.
 */
export function applyRules(flat: Record<string, unknown>, { scope, fullPrefix, media }: ResolvedVarsOptions) {
  const entries = Object.entries(flat);
  const len = entries.length;
  const key = varsBucketKey(scope, media);

  if (!scopedVarsRulesMap.has(key)) {
    scopedVarsRulesMap.set(key, new Map());
  }

  const scopeMap = scopedVarsRulesMap.get(key)!;
  let i = 0;
  while (i < len) {
    const [k, v] = entries[i++] as [string, unknown];
    scopeMap.set(`${fullPrefix}${k}`, String(v));
  }

  upsertRule(VARS_ID, key, varsRuleText(scope, media, serializeDecls(scopeMap)));
}

/**
 * @internal
 * Removes the given flat variable keys from the scope+media rules map
 * and updates the stylesheet. If the bucket is now empty, its rule
 * is removed entirely.
 * Takes the pre-resolved options from `resolveVarsOptions`.
 */
export function removeFromScope(flatKeys: string[], { scope, fullPrefix, media }: ResolvedVarsOptions): void {
  const key = varsBucketKey(scope, media);
  const scopeMap = scopedVarsRulesMap.get(key);
  if (!scopeMap) return;

  let i = 0;
  const len = flatKeys.length;
  while (i < len) {
    scopeMap.delete(`${fullPrefix}${flatKeys[i++]}`);
  }

  if (scopeMap.size === 0) {
    scopedVarsRulesMap.delete(key);
    removeRule(VARS_ID, key);
  } else {
    upsertRule(VARS_ID, key, varsRuleText(scope, media, serializeDecls(scopeMap)));
  }
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
 * Keys arrive already prefixed (dots intact); dots fold to hyphens here.
 * Shared by applyRules (scope map) and the cssVars server text return.
 */
export function serializeDecls(entries: Iterable<[string, unknown]>): string {
  const pairs = Array.from(entries);
  let i = 0;
  const len = pairs.length;
  let out = "";
  while (i < len) {
    const [k, v] = pairs[i++]!;
    out += `--${k.replace(DOT_REGEX, "-")}:${v}`;
    if (i < len) out += ";";
  }
  return out;
}
