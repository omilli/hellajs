import { isFunction, isNumber, isObject, isPlainObject, isString } from "./internal/core";
import { registerText } from "./internal/injection";
import type { CSSObject, CSSOptions } from "./types";

const AMP_REGEX = /&/g;
const CAMEL_REGEX = /[A-Z]/g;

/**
 * Kebab-case property names whose numeric values stay unitless; both key spellings
 * resolve through the kebab conversion in process() (camelCase keys convert before
 * the lookup, kebab-case keys are their own kebab form). Every other property appends
 * `px` to numeric values (px-by-default with a unitless allowlist — the inverse,
 * a length-property list, is unbounded and drifts with CSS). `--` custom properties never
 * take a unit; they bypass this set via the custom-property key check in process().
 */
const UNITLESS_PROPERTIES = new Set([
  "animation-iteration-count", "aspect-ratio", "border-image-outset", "border-image-slice", "border-image-width",
  "column-count", "columns", "flex", "flex-grow", "flex-positive", "flex-shrink", "flex-negative", "flex-order",
  "grid-area", "grid-row", "grid-row-end", "grid-row-span", "grid-row-start", "grid-column", "grid-column-end",
  "grid-column-span", "grid-column-start", "font-weight", "line-clamp", "line-height", "opacity", "order",
  "orphans", "scale", "tab-size", "widows", "z-index", "zoom", "fill-opacity", "flood-opacity", "stop-opacity",
  "stroke-dasharray", "stroke-dashoffset", "stroke-miterlimit", "stroke-opacity", "stroke-width"
]);

/**
 * At-rule prefixes that wrap style declarations (as opposed to defining top-level constructs).
 */
const CONDITIONAL_AT_RULES = ["@media", "@container", "@supports", "@starting-style"] as const;

/**
 * Creates CSS rules from JavaScript objects. Global only.
 *
 * Registers the generated rules on both platforms and returns an empty string.
 * On the client (DOM available) rules are injected into the CSSOM; on the
 * server the registration is state-only — collect the text with `cssText()`.
 * For scoped/hashed styles, use `style()`.
 * @param obj CSS object containing style properties and nested selectors
 * @param options Optional configuration. Provide `host` to create the `<style>` element in a shadow root or other parent node instead of `document.head`.
 * @returns Always returns empty string (for backward compatibility), on both platforms.
 * @throws {Error} When obj is not a plain object, when a property value is a function — use `vars()`
 * for reactive values, when a conditional at-rule body contains direct style declarations with no
 * selector in scope — nest selectors under the at-rule, or when the object contains top-level
 * declarations with no selector — nest them under a selector or at-rule.
 */
export function css(obj: CSSObject, options: CSSOptions = {}): string {
  if (!isPlainObject(obj)) throw new Error(`[css] css: expected a CSS object, received ${String(obj)}`);

  const { host } = options;
  const cssText = process(obj, "", true);

  registerText(cssText, host);
  return "";
}

/**
 * @internal
 * Recursively traverses a CSS object and builds the final CSS string.
 * Conditional at-rules (@media, @container, @supports, @starting-style) inherit
 * the active parent selector (any nested selector); with no selector in scope,
 * a conditional at-rule body containing direct style declarations throws. A
 * top-level entry (css()/removeCss()) with direct declarations under non-`@`
 * keys likewise throws — no selector is in scope (`@`-prefixed scalar keys are
 * block-less statements, emitted `@key value;` and hoisted ahead of all
 * braced text in the same call's emission, mirroring the client placement).
 * Definitional at-rules (@keyframes, @font-face, @layer, etc.) always process
 * content with an empty selector; their direct declarations emit bare (e.g.
 * `@font-face{font-family:…}`). The `&` token in nested selectors is replaced
 * with the parent selector. CamelCase property keys convert to kebab-case.
 * The `content` property auto-quotes unquoted strings. Array values join with
 * commas. Numeric values append `px` except on unitless properties and `--` custom
 * properties. Null and undefined values are skipped. Function values throw —
 * reactive values belong to `vars()`.
 *
 * Exported so removeCss can re-derive the same text — deterministic: the same
 * object always produces the same text.
 *
 * @param obj CSS object to process
 * @param selector Parent selector for nesting resolution
 * @param isTopLevel True only at the css()/removeCss() entry calls; every recursion and
 * derived rule builder (keyframes steps, scoped styles) passes false
 */
export function process(obj: CSSObject, selector: string, isTopLevel: boolean): string {
  const rules: string[] = [];
  const properties: string[] = [];
  const statements: string[] = [];
  let hasDirectDeclaration = false;
  const keys = Object.keys(obj);
  let i = 0;
  const len = keys.length;

  while (i < len) {
    const key = keys[i++] as string;
    const value = obj[key];
    if (value == null) continue;

    if (isObject(value) && !Array.isArray(value)) {
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
        if (isConditional && !selector) {
          // Direct declarations with no selector would emit a selector-less block
          // the browser silently drops — reject loudly instead.
          const body = value as CSSObject;
          const bodyKeys = Object.keys(body);
          let bi = 0;
          const bLen = bodyKeys.length;
          while (bi < bLen) {
            const bodyValue = body[bodyKeys[bi++] as string];
            if (bodyValue != null && !isPlainObject(bodyValue)) {
              throw new Error(`[css] conditional at-rule "${key}" contains declarations with no selector — nest selectors under the at-rule`);
            }
          }
        }
        const nestedCss = isConditional && selector
          ? process(value as CSSObject, selector, false)
          : process(value as CSSObject, "", false);
        rules.push(`${key}{${nestedCss}}`);
      } else {
        let nestedSelector: string;
        if (key.startsWith("&")) {
          nestedSelector = key.replace(AMP_REGEX, selector);
        } else if (selector) {
          // Compose against the parent selector when one exists (scoped `.{name}`
          // or any key nested under a non-empty global selector). Top-level global
          // keys have an empty selector and stay unwrapped (raw CSS selectors).
          nestedSelector = `${selector} ${key}`;
        } else {
          nestedSelector = key;
        }

        rules.push(process(value as CSSObject, nestedSelector, false));
      }
    } else {
      if (isFunction(value)) {
        throw new Error(`[css] function values are not supported in css objects — use vars() for reactive values, key: ${key}`);
      }
      // @-prefixed scalar keys are block-less at-statements (@import, @charset,
      // @namespace): the value is the statement body, not a declaration. They
      // lead the emitted text (statements must precede every rule) and take no
      // scope, like definitional at-rules.
      if (key.startsWith("@")) {
        statements.push(`${key} ${Array.isArray(value) ? value.join(", ") : String(value)};`);
        continue;
      }
      const isCustom = key.startsWith("--");
      const property = isCustom ? key : key.replace(CAMEL_REGEX, (match) => `-${match.toLowerCase()}`);
      let cssValue: string;
      if (Array.isArray(value)) {
        cssValue = value.join(", ");
      } else if (isNumber(value) && !isCustom && !UNITLESS_PROPERTIES.has(property)) {
        cssValue = `${value}px`;
      } else {
        cssValue = String(value);
      }

      if (property === "content" && isString(value) && !value.startsWith("\"") && !value.startsWith("'")) {
        cssValue = `"${value}"`;
      }

      if (isTopLevel) hasDirectDeclaration = true;
      properties.push(`${property}:${cssValue}`);
    }
  }

  // A top-level entry with direct declarations would emit selector-less text the
  // platform silently drops — reject loudly instead.
  if (isTopLevel && hasDirectDeclaration) {
    throw new Error("[css] top-level declarations have no selector — nest them under a selector or at-rule");
  }
  const statementText = statements.join("");
  if (properties.length === 0) return `${statementText}${rules.join("")}`;
  // No active selector: emit declarations bare (e.g. inside @font-face). Rules
  // precede declarations; statements precede both — the registerText split
  // segments on depth-0 ";" and closing braces, so each piece stays whole.
  if (!selector) return `${statementText}${rules.join("")}${properties.join(";")}`;
  return `${statementText}${selector}{${properties.join(";")}}${rules.join("")}`;
}
