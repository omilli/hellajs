import { hasDocument, isPlainObject } from "./internal/core";
import { upsertRule } from "./internal/sheet";
import { STYLE_ID, injectedMap, syncTextContent } from "./internal/cssStore";
import type { InjectedEntry } from "./internal/cssStore";
import type { CSSObject, CSSOptions } from "./types";

const AMP_REGEX = /&/g;
const CAMEL_REGEX = /[A-Z]/g;

/**
 * At-rule prefixes that wrap style declarations (as opposed to defining top-level constructs).
 * When a class scope is active (css() called with `name`), content inside these at-rules
 * inherits the parent selector instead of being processed with an empty selector. Unchanged
 * when called without `name` (global mode).
 */
const CONDITIONAL_AT_RULES = ["@media", "@container", "@supports", "@starting-style"];

/**
 * Creates CSS rules from JavaScript objects. Global by default.
 *
 * On the client (DOM available): injects rules into the CSSOM and returns the provided
 * `name` (or empty string for global). On the server (no DOM): returns the generated CSS
 * text directly, with zero state mutation.
 * @param obj CSS object containing style properties and nested selectors
 * @param options Optional configuration. Provide `name` to create a scoped `.{name}` selector and get a return value for `class` attributes.
 * @returns The provided `name` string (or empty string for global) on the client; the CSS text on the server.
 * @throws {Error} When obj is not a plain object.
 */
export function css(obj: CSSObject, options: CSSOptions = {}): string {
  if (!isPlainObject(obj)) throw new Error(`[css] css: expected a CSS object, received ${String(obj)}`);

  const { name } = options;
  const isGlobal = !name;
  const selector = name ? `.${name}` : "";
  const cssText = process(obj, selector, isGlobal);

  if (!hasDocument()) return cssText;

  const existing = injectedMap.get(cssText);
  if (existing) {
    existing.count++;
    return name || "";
  }

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

  let ri = 0;
  const rlen = rules.length;
  while (ri < rlen) {
    upsertRule(STYLE_ID, `${cssText}:${ri}`, rules[ri]!);
    ri++;
  }

  const entry: InjectedEntry = { count: 1, ruleCount: rules.length };
  injectedMap.set(cssText, entry);
  syncTextContent();

  return name || "";
}

/**
 * @internal
 * Recursively traverses a CSS object and builds the final CSS string.
 * Conditional at-rules (@media, @container, @supports, @starting-style) inherit
 * the parent scope when a class name is active, producing scoped selectors inside
 * the at-block. Definitional at-rules (@keyframes, @font-face, @layer, etc.) always
 * process content globally. The `&` token in nested selectors is replaced with
 * the parent selector. CamelCase property keys convert to kebab-case.
 * The `content` property auto-quotes unquoted strings. Array values join with
 * commas. Null and undefined values are skipped.
 *
 * Exported so removeCss can re-derive the same text from (obj, options) —
 * deterministic: the same object always produces the same text.
 *
 * @param obj CSS object to process
 * @param selector Parent selector for nesting resolution
 * @param isGlobal Whether styles are applied globally (no selector wrapping)
 */
export function process(obj: CSSObject, selector: string, isGlobal: boolean): string {
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
