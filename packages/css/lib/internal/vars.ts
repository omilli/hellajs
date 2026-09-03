import { hostQualifier, removeRule, upsertRule } from "./sheet";
import type { CSSVars, VarsOptions } from "../types";
/**
 * @internal
 */
export const VARS_ID = "hella-vars";

/**
 * @internal
 */
export const scopedVarsRulesMap = new Map<string, VarsBucket>();

/**
 * One scope+media bucket under an optional host: the resolved placement
 * (scope selector, media condition, host) plus the accumulated variable
 * declarations. The placement travels with the bucket so `varsText()` can
 * serialize default-host buckets without parsing the composite bucket key.
 */
interface VarsBucket {
  scope: string;
  media: string;
  host?: ParentNode;
  vars: Map<string, string>;
}

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
 * Registry entry tracking a single vars() call's flat keys, scope,
 * resolved prefix (trailing hyphen included), resolved media condition,
 * style host, reference count, and optional effect cleanup.
 */
interface VarsEntry {
  flatKeys: string[];
  scope: string;
  fullPrefix: string;
  media: string;
  host?: ParentNode;
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
 * trailing-hyphenated, media normalized to `""` when absent, host passed
 * through for sheet placement and key qualification.
 */
interface ResolvedVarsOptions {
  scope: string;
  fullPrefix: string;
  media: string;
  host?: ParentNode;
}

/**
 * @internal
 * Resolves VarsOptions once: scope falls back to `:root`, the raw prefix
 * gains its trailing hyphen, media normalizes to `""`. Every vars path
 * derives scope/prefix/media/host through this — the single definition (no
 * per-site duplication to drift).
 */
export function resolveVarsOptions({ scoped, prefix: rawPrefix = "", media, host }: VarsOptions): ResolvedVarsOptions {
  return {
    scope: scoped || ":root",
    fullPrefix: rawPrefix ? `${rawPrefix}-` : "",
    media: media || "",
    host,
  };
}

/**
 * Composite bucket/rule key for one scope+media pair under an optional host —
 * the same scope under different media conditions or in different hosts
 * coexists as separate buckets.
 */
function varsBucketKey(scope: string, media: string, host?: ParentNode): string {
  return `${media ? `@media ${media}` : ""}|${hostQualifier(host)}${scope}`;
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
export function applyRules(flat: Record<string, unknown>, { scope, fullPrefix, media, host }: ResolvedVarsOptions) {
  const entries = Object.entries(flat);
  const len = entries.length;
  const key = varsBucketKey(scope, media, host);

  let bucket = scopedVarsRulesMap.get(key);
  if (!bucket) {
    bucket = { scope, media, host, vars: new Map() };
    scopedVarsRulesMap.set(key, bucket);
  }

  let i = 0;
  while (i < len) {
    const [k, v] = entries[i++] as [string, unknown];
    bucket.vars.set(`${fullPrefix}${k}`, String(v));
  }

  upsertRule(VARS_ID, key, varsRuleText(scope, media, serializeDecls(bucket.vars)), host);
}

/**
 * @internal
 * Removes the given flat variable keys from the scope+media rules map
 * and updates the stylesheet. If the bucket is now empty, its rule
 * is removed entirely.
 * Takes the pre-resolved options from `resolveVarsOptions`.
 */
export function removeFromScope(flatKeys: string[], { scope, fullPrefix, media, host }: ResolvedVarsOptions): void {
  const key = varsBucketKey(scope, media, host);
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
    upsertRule(VARS_ID, key, varsRuleText(scope, media, serializeDecls(bucket.vars)), host);
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
    if (!bucket.host) text += varsRuleText(bucket.scope, bucket.media, serializeDecls(bucket.vars));
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
