import { hostQualifier, removeRule, upsertRule } from "./sheet";
import type { CSSVars, VarsOptions } from "../types";
/**
 * id attribute of the `<style>` element all vars() rules inject into.
 * @internal
 */
export const VARS_ID = "hella-vars";

/**
 * Scope+media+layer bucket registry keyed by the composite bucket key.
 * @internal
 */
export const scopedVarsRulesMap = new Map<string, VarsBucket>();

/**
 * One scope+media+layer bucket under an optional host: the resolved placement
 * (scope selector, media condition, cascade layer, host) plus the accumulated
 * variable declarations. The placement travels with the bucket so `varsText()`
 * can serialize default-host buckets without parsing the composite bucket key.
 */
interface VarsBucket {
  scope: string;
  media: string;
  layer: string;
  host?: ParentNode;
  vars: Map<string, string>;
}

/**
 * Flattened-input cache behind vars() result lookups, evicted LRU at CACHE_MAX.
 * @internal
 */
export const cache = new Map<string, { flattened: Record<string, unknown>, result: unknown }>();

/**
 * Cache size cap triggering oldest-entry eviction.
 * @internal
 */
export const CACHE_MAX = 100;

/**
 * Global-dot pattern for rewriting dotted var keys to nested-scope hyphens.
 * @internal
 */
export const DOT_REGEX = /\./g;

/**
 * Registry entry tracking a single vars() call's flat keys, scope,
 * resolved prefix (trailing hyphen included), resolved media condition,
 * resolved cascade layer, style host, reference count, and optional effect
 * cleanup.
 */
interface VarsEntry {
  flatKeys: string[];
  scope: string;
  fullPrefix: string;
  media: string;
  layer: string;
  host?: ParentNode;
  refCount: number;
  cleanup?: () => void;
}

/**
 * Server/state-only vars() registry: flat keys, prefix, media, host, refcount, cleanup.
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
 * trailing-hyphenated, media and layer normalized to `""` when absent, host
 * passed through for sheet placement and key qualification.
 */
interface ResolvedVarsOptions {
  scope: string;
  fullPrefix: string;
  media: string;
  layer: string;
  host?: ParentNode;
}

/**
 * @internal
 * Resolves VarsOptions once: scope falls back to `:root`, the raw prefix
 * gains its trailing hyphen, media and layer normalize to `""`. Every vars
 * path derives scope/prefix/media/layer/host through this — the single
 * definition (no per-site duplication to drift).
 */
export function resolveVarsOptions({ scoped, prefix: rawPrefix = "", media, layer, host }: VarsOptions): ResolvedVarsOptions {
  return {
    scope: scoped || ":root",
    fullPrefix: rawPrefix ? `${rawPrefix}-` : "",
    media: media || "",
    layer: layer || "",
    host,
  };
}

/**
 * Composite bucket/rule key for one scope+media+layer triple under an
 * optional host — the same scope under different media conditions, layers,
 * or hosts coexists as separate buckets.
 */
function varsBucketKey(scope: string, media: string, layer: string, host?: ParentNode): string {
  return `${media ? `@media ${media}` : ""}|${layer ? `@layer ${layer}` : ""}|${hostQualifier(host)}${scope}`;
}

/**
 * @internal
 * Full rule text for one scope+media+layer bucket: declarations wrapped in
 * the scope selector, then in the media at-rule when present, then in the
 * layer at-rule (outermost) when present.
 */
export function varsRuleText(scope: string, media: string, layer: string, decls: string): string {
  const inner = `${media ? `@media ${media}{` : ""}${scope}{${decls}}${media ? "}" : ""}`;
  return layer ? `@layer ${layer}{${inner}}` : inner;
}

/**
 * @internal
 * Writes flattened variable declarations to the scoped rules map
 * and upserts the scope rule into the stylesheet.
 * Takes the pre-resolved options from `resolveVarsOptions`.
 */
export function applyRules(flat: Record<string, unknown>, { scope, fullPrefix, media, layer, host }: ResolvedVarsOptions) {
  const entries = Object.entries(flat);
  const len = entries.length;
  const key = varsBucketKey(scope, media, layer, host);

  let bucket = scopedVarsRulesMap.get(key);
  if (!bucket) {
    bucket = { scope, media, layer, host, vars: new Map() };
    scopedVarsRulesMap.set(key, bucket);
  }

  let i = 0;
  while (i < len) {
    const [k, v] = entries[i++] as [string, unknown];
    bucket.vars.set(`${fullPrefix}${k}`, String(v));
  }

  upsertRule(VARS_ID, key, varsRuleText(scope, media, layer, serializeDecls(bucket.vars)), host);
}

/**
 * @internal
 * Removes the given flat variable keys from the scope+media rules map
 * and updates the stylesheet. If the bucket is now empty, its rule
 * is removed entirely.
 * Takes the pre-resolved options from `resolveVarsOptions`.
 */
export function removeFromScope(flatKeys: string[], { scope, fullPrefix, media, layer, host }: ResolvedVarsOptions): void {
  const key = varsBucketKey(scope, media, layer, host);
  const bucket = scopedVarsRulesMap.get(key);
  if (!bucket) return;

  let i = 0;
  const len = flatKeys.length;
  while (i < len) {
    bucket.vars.delete(`${fullPrefix}${flatKeys[i++]}`);
  }

  if (bucket.vars.size === 0) {
    scopedVarsRulesMap.delete(key);
    removeRule(VARS_ID, key, host);
  } else {
    upsertRule(VARS_ID, key, varsRuleText(scope, media, layer, serializeDecls(bucket.vars)), host);
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
 * @internal
 * Serializes every default-host bucket's rule text in insertion order —
 * the vars contribution `cssText()` appends after the css-side text.
 * Hosted buckets are skipped: their rules live in host sheets, not
 * `document.head`.
 */
export function varsText(): string {
  let text = "";
  scopedVarsRulesMap.forEach((bucket) => {
    if (!bucket.host) text += varsRuleText(bucket.scope, bucket.media, bucket.layer, serializeDecls(bucket.vars));
  });
  return text;
}

/**
 * @internal No-space CSSOM declaration form: `--k:v;--k2:v2`.
 * Keys arrive already prefixed (dots intact); dots fold to hyphens here.
 * Shared by applyRules (scope map), the vars server registration, and
 * varsText (cssText vars contribution).
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
