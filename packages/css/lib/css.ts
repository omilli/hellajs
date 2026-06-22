import { hasDocument, isPlainObject } from "./internal/core";
import { upsertRule, removeRule, resetSheet } from "./sheet";
import { stringify } from "./shared";
import type { CSSObject, CSSOptions } from "./types";

const STYLE_ID = "hella-css";

const AMP_REGEX = /&/g;
const CAMEL_REGEX = /[A-Z]/g;

/**
 * At-rule prefixes that wrap style declarations (as opposed to defining top-level constructs).
 * When a class scope is active (css() called with `name`), content inside these at-rules
 * inherits the parent selector instead of being processed with an empty selector. Unchanged
 * when called without `name` (global mode).
 */
const CONDITIONAL_AT_RULES = ["@media", "@container", "@supports", "@starting-style"];

const refCounts = new Map<string, number>();
const inlineCache = new Map<string, string>();
const cssRulesMap = new Map<string, string>();
const ruleCounts = new Map<string, number>();

/**
 * Creates a deterministic cache key from the CSS object and options.
 */
function hashKey(obj: CSSObject, options: CSSOptions): string {
  return `${stringify(obj)}:${options.name || ""}`;
}

/**
 * Mirrors the current CSS rules text into the style element for DevTools visibility.
 */
function syncTextContent(): void {
  if (!hasDocument()) return;
  const el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (el) {
    el.textContent = Array.from(cssRulesMap.values()).join("");
  }
}

/**
 * Creates CSS rules from JavaScript objects. Global by default. Returns a class name when `name` is provided.
 * @param obj CSS object containing style properties and nested selectors
 * @param options Optional configuration. Provide `name` to create a scoped `.{name}` selector and get a return value for `class` attributes.
 * @returns The provided `name` string, or empty string for global styles
 */
export function css(obj: CSSObject, options: CSSOptions = {}): string {
  if (!isPlainObject(obj)) throw new Error(`[css] css: expected a CSS object, received ${String(obj)}`);

  const key = hashKey(obj, options);

  if (inlineCache.has(key)) {
    refCounts.set(key, (refCounts.get(key) || 0) + 1);
    return inlineCache.get(key)!;
  }

  const { name } = options;
  const isGlobal = !name;
  const selector = name ? `.${name}` : "";
  const cssText = process(obj, selector, isGlobal);

  // Split into individual top-level rules at brace-depth boundaries.
  const rules: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  const len = cssText.length;
  while (i < len) {
    const ch = cssText[i++];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        rules.push(cssText.slice(start, i));
        start = i;
      }
    }
  }

  ruleCounts.set(key, rules.length);

  if (hasDocument()) {
    let i = 0;
    const len = rules.length;
    while (i < len) {
      upsertRule(STYLE_ID, `${key}:${i}`, rules[i]!);
      i++;
    }
  }

  cssRulesMap.set(key, cssText);
  syncTextContent();

  refCounts.set(key, (refCounts.get(key) || 0) + 1);

  const result = name || "";
  inlineCache.set(key, result);

  return result;
}

/**
 * Removes specific CSS rules and decrements their reference count for memory management.
 * @param obj CSS object to remove (structurally identical objects match, same reference not required)
 * @param options Optional configuration object (must match the options used in css())
 */
export function cssRemove(obj: CSSObject, options: CSSOptions = {}): void {
  if (!isPlainObject(obj)) throw new Error(`[css] cssRemove: expected a CSS object, received ${String(obj)}`);

  const key = hashKey(obj, options);

  if (!refCounts.has(key)) return;

  const currentCount = refCounts.get(key)!;
  if (currentCount > 1) {
    refCounts.set(key, currentCount - 1);
  } else {
    refCounts.delete(key);
    inlineCache.delete(key);
    const count = ruleCounts.get(key);
    if (hasDocument() && count !== undefined) {
      let i = 0;
      while (i < count) removeRule(STYLE_ID, `${key}:${i++}`);
    }
    ruleCounts.delete(key);
    cssRulesMap.delete(key);
    syncTextContent();
  }
}

/**
 * Clears all CSS rules, caches, and resets the CSS system to initial state.
 */
export function cssReset() {
  inlineCache.clear();
  refCounts.clear();
  cssRulesMap.clear();
  ruleCounts.clear();
  if (hasDocument()) resetSheet(STYLE_ID);
}

/**
 * Recursively traverses a CSS object and builds the final CSS string.
 * Conditional at-rules (@media, @container, @supports, @starting-style) inherit
 * the parent scope when a class name is active, producing scoped selectors inside
 * the at-block. Definitional at-rules (@keyframes, @font-face, @layer, etc.) always
 * process content globally. The `&` token in nested selectors is replaced with
 * the parent selector. CamelCase property keys convert to kebab-case.
 * The `content` property auto-quotes unquoted strings. Array values join with
 * commas. Null and undefined values are skipped.
 *
 * @param obj CSS object to process
 * @param selector Parent selector for nesting resolution
 * @param isGlobal Whether styles are applied globally (no selector wrapping)
 */
function process(obj: CSSObject, selector: string, isGlobal: boolean): string {
  const rules: string[] = [];
  const properties: string[] = [];
  const keys = Object.keys(obj);
  let i = 0;

  while (i < keys.length) {
    const key = keys[i++] as string;
    const value = obj[key];
    if (value == null) continue;

    if (typeof value === "object" && !Array.isArray(value)) {
      if (key.startsWith("@")) {
        let isConditional = false;
        let ci = 0;
        const cLen = CONDITIONAL_AT_RULES.length;
        while (ci < cLen) {
          if (key.startsWith(CONDITIONAL_AT_RULES[ci]!)) {
            isConditional = true;
            break;
          }
          ci++;
        }
        const nestedCss = isConditional && !isGlobal
          ? process(value as CSSObject, selector, isGlobal)
          : process(value as CSSObject, "", true);
        rules.push(`${key}{${nestedCss}}`);
      } else {
        let nestedSelector: string;
        if (key.startsWith("&")) {
          nestedSelector = key.replace(AMP_REGEX, selector);
        } else if (!isGlobal) {
          nestedSelector = `${selector} ${key}`;
        } else {
          nestedSelector = key;
        }

        rules.push(process(value as CSSObject, nestedSelector, isGlobal));
      }
    } else {
      const property = key.startsWith("--") ? key : key.replace(CAMEL_REGEX, (match) => `-${match.toLowerCase()}`);
      let cssValue = Array.isArray(value) ? value.join(", ") : String(value);

      if (property === "content" && typeof value === "string" && !value.startsWith("\"") && !value.startsWith("'")) {
        cssValue = `"${value}"`;
      }

      properties.push(`${property}:${cssValue}`);
    }
  }

  if (properties.length === 0) return rules.join("");
  return `${selector}{${properties.join(";")}}${rules.join("")}`;
}
