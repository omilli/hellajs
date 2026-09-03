import { isPlainObject, isString } from "./internal/core";
import { scopedRule } from "./internal/identity";
import type { ScopedRule } from "./internal/identity";
import { registerText } from "./internal/injection";
import type { CVAConfig, CVAMedia, CVAProps, CVAVariants, StyleObject } from "./types";

/**
 * One variant's resolved selection: the un-wrapped `initial` slot plus
 * explicit breakpoint selections keyed into the recipe's `media`.
 */
interface ResolvedSelection {
  initial?: string;
  bps?: Record<string, string>;
}

/**
 * Appends a class fragment unless an identical one is already present — the
 * same variant selected at `initial` and a breakpoint contributes one class
 * attribute entry while registering both rules.
 * @param classes Accumulated class fragments
 * @param cls Fragment to append; empty fragments drop
 */
function appendClass(classes: string[], cls: string): void {
  if (cls && !classes.includes(cls)) classes.push(cls);
}

/**
 * Normalizes one variant prop into its resolved selection: a scalar fills the
 * `initial` slot, a responsive object contributes `initial` plus breakpoint
 * slots, and a missing (or `initial`-less) prop falls back to the default
 * selection.
 * @param prop The raw prop value for one variant
 * @param fallback The variant's `defaultVariants` entry, if any
 * @returns The resolved selection
 */
function resolveSelection(prop: unknown, fallback: string | undefined): ResolvedSelection {
  if (isPlainObject(prop)) {
    let bps: Record<string, string> | undefined;
    const keys = Object.keys(prop);
    let i = 0;
    const len = keys.length;
    while (i < len) {
      const bp = keys[i++] as string;
      const value = (prop as Record<string, unknown>)[bp];
      if (bp === "initial" || value === undefined) continue;
      if (bps === undefined) bps = {};
      bps[bp] = `${value}`;
    }
    const initial = (prop as Record<string, unknown>)["initial"];
    return { initial: initial === undefined ? fallback : `${initial}`, bps };
  }
  if (prop === undefined) return { initial: fallback };
  return { initial: `${prop}` };
}

/**
 * Whether every selection stated on a compound equals the resolved one: a
 * scalar states the `initial` slot, a responsive object states `initial`
 * and/or breakpoint slots, and `css` carries the style. A stated slot with no
 * resolved counterpart never matches.
 * @param compound One compoundVariants entry
 * @param resolved The resolved selection per variant key
 * @returns True when every stated selection matches
 */
function matchesCompound(compound: Record<string, unknown>, resolved: Record<string, ResolvedSelection>): boolean {
  const keys = Object.keys(compound);
  let i = 0;
  const len = keys.length;
  while (i < len) {
    const key = keys[i++] as string;
    if (key === "css") continue;
    const stated = compound[key];
    const selection = resolved[key];
    if (isPlainObject(stated)) {
      const slots = Object.keys(stated);
      let j = 0;
      const jLen = slots.length;
      while (j < jLen) {
        const slot = slots[j++] as string;
        const statedValue = (stated as Record<string, unknown>)[slot];
        if (statedValue === undefined) continue;
        const resolvedValue = slot === "initial" ? selection?.initial : selection?.bps?.[slot];
        if (resolvedValue !== `${statedValue}`) return false;
      }
    } else if (stated !== undefined) {
      if (selection?.initial !== `${stated}`) return false;
    }
  }
  return true;
}

/**
 * Derives the compound's label from its stated selections —
 * `size-lg-tone-danger`, with a breakpoint slot as `size-md-lg`.
 * @param compound One compoundVariants entry
 * @returns The joined label (empty when the compound states nothing)
 */
function compoundLabel(compound: Record<string, unknown>): string {
  const parts: string[] = [];
  const keys = Object.keys(compound);
  let i = 0;
  const len = keys.length;
  while (i < len) {
    const key = keys[i++] as string;
    if (key === "css") continue;
    const stated = compound[key];
    if (isPlainObject(stated)) {
      const slots = Object.keys(stated);
      let j = 0;
      const jLen = slots.length;
      while (j < jLen) {
        const slot = slots[j++] as string;
        const value = (stated as Record<string, unknown>)[slot];
        if (value !== undefined) {
          parts.push(slot === "initial" ? `${key}-${value}` : `${key}-${slot}-${value}`);
        }
      }
    } else if (stated !== undefined) {
      parts.push(`${key}-${stated}`);
    }
  }
  return parts.join("-");
}

/**
 * Creates a variant recipe from a config object and returns a callable that
 * resolves props into a composed class string — the same string on client and
 * server. `base` leads, each selected variant contributes its class in config
 * order, then every matching `compoundVariants` entry contributes its own
 * class; fragments join with single spaces. Each variant value, breakpoint
 * selection, and compound generates its content-hashed class lazily on first
 * resolution (`h-{label}-{hash}`, the label derived from the selection) and
 * registers through the shared reference-counted flow — only the CSS a render
 * actually resolves is ever generated, so [`cssText`](/reference/css/csstext)
 * collects exactly the critical CSS on the server. String values in `base`,
 * variant, and compound slots pass through verbatim with no rule generated.
 * Reactivity rides the caller: `class={() => button({ size: size() })}`.
 * @param config Variant configuration
 * @returns The recipe callable — resolves props to a class string
 * @throws {Error} When config, `variants`, `base`, or `media` has an invalid shape; when props is neither an object nor undefined; when a resolved value is absent from its variant or a breakpoint is absent from `media`.
 */
export function cva<V extends CVAVariants, M extends CVAMedia>(config: CVAConfig<V, M>): (props?: CVAProps<V, M>) => string {
  if (!isPlainObject(config)) throw new Error(`[css] cva: expected a config object, received ${String(config)}`);
  const { base, media, variants, defaultVariants, compoundVariants } = config;
  if (!isPlainObject(variants)) throw new Error(`[css] cva: expected a variants object, received ${String(variants)}`);
  if (base !== undefined && !isString(base) && !isPlainObject(base)) {
    throw new Error(`[css] cva: expected base to be a style object or class string, received ${String(base)}`);
  }
  if (media !== undefined && !isPlainObject(media)) {
    throw new Error(`[css] cva: expected media to be a breakpoint object, received ${String(media)}`);
  }

  // Derived rules per cache key (`variant:value[:bp]`, `base`, `compound:{i}`).
  const cache = new Map<string, ScopedRule>();

  /**
   * Derives (or reuses) the rule for a cache key and re-registers its text —
   * `injectedMap` keeps the reference count exact across repeat resolutions.
   */
  const registerRule = (cacheKey: string, obj: StyleObject, label: string, mediaQuery?: string): string => {
    let rule = cache.get(cacheKey);
    if (rule === undefined) {
      rule = scopedRule(obj, { label, media: mediaQuery });
      cache.set(cacheKey, rule);
    }
    registerText(rule.cssText);
    return rule.cls;
  };

  /**
   * Resolves one variant selection to its class: a string value passes
   * through verbatim, an object generates lazily under its derived label,
   * and a breakpoint selection wraps in its media condition.
   */
  const variantClass = (key: string, value: string, bp?: string): string => {
    const def = (variants as Record<string, Record<string, StyleObject | string | undefined>>)[key]?.[value];
    if (def === undefined) throw new Error(`[css] cva: unknown value "${value}" for variant "${key}"`);
    if (isString(def)) return def;
    if (bp === undefined) return registerRule(`${key}:${value}`, def, `${key}-${value}`);
    const query = (media as Record<string, string | undefined> | undefined)?.[bp];
    if (query === undefined) {
      throw new Error(`[css] cva: unknown breakpoint "${bp}" for variant "${key}" — add it to the media config`);
    }
    return registerRule(`${key}:${value}:${bp}`, def, `${key}-${value}`, query);
  };

  return (props?: CVAProps<V, M>): string => {
    if (props !== undefined && !isPlainObject(props)) {
      throw new Error(`[css] cva: expected a props object, received ${String(props)}`);
    }

    const classes: string[] = [];
    const resolved: Record<string, ResolvedSelection> = {};
    const record = props as Record<string, unknown> | undefined;

    if (isString(base)) appendClass(classes, base);
    else if (base !== undefined) appendClass(classes, registerRule("base", base, "base"));

    const keys = Object.keys(variants);
    let i = 0;
    const len = keys.length;
    while (i < len) {
      const key = keys[i++] as string;
      const selection = resolveSelection(record?.[key], (defaultVariants as Record<string, string | undefined> | undefined)?.[key]);
      resolved[key] = selection;
      if (selection.initial !== undefined) appendClass(classes, variantClass(key, selection.initial));
      const bps = selection.bps;
      if (bps !== undefined) {
        const bpKeys = Object.keys(bps);
        let j = 0;
        const jLen = bpKeys.length;
        while (j < jLen) {
          const bp = bpKeys[j++] as string;
          appendClass(classes, variantClass(key, bps[bp]!, bp));
        }
      }
    }

    if (compoundVariants !== undefined) {
      let ci = 0;
      const cLen = compoundVariants.length;
      while (ci < cLen) {
        const compound = compoundVariants[ci] as unknown as Record<string, unknown>;
        if (matchesCompound(compound, resolved)) {
          const cssValue = compound["css"] as StyleObject | string | undefined;
          if (isString(cssValue)) appendClass(classes, cssValue);
          else if (isPlainObject(cssValue)) {
            appendClass(classes, registerRule(`compound:${ci}`, cssValue, compoundLabel(compound)));
          }
        }
        ci++;
      }
    }

    return classes.join(" ");
  };
}
