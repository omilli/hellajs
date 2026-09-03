import { isFunction, isNumber, isObject, isPlainObject, isString } from "./internal/core";
import { registerText } from "./internal/injection";
import type { CSSObject, CSSOptions } from "./types";

const AMP_REGEX = /&/g;
const CAMEL_REGEX = /[A-Z]/g;

/**
 * CamelCase property names whose numeric values stay unitless. Every other property
 * appends `px` to numeric values (px-by-default with a unitless allowlist — the inverse,
 * a length-property list, is unbounded and drifts with CSS). `--` custom properties never
 * take a unit; they bypass this set via the custom-property key check in process().
 */
const UNITLESS_PROPERTIES = new Set([
  "animationIterationCount", "aspectRatio", "borderImageOutset", "borderImageSlice", "borderImageWidth",
  "columnCount", "columns", "flex", "flexGrow", "flexPositive", "flexShrink", "flexNegative", "flexOrder",
  "gridArea", "gridRow", "gridRowEnd", "gridRowSpan", "gridRowStart", "gridColumn", "gridColumnEnd",
  "gridColumnSpan", "gridColumnStart", "fontWeight", "lineClamp", "lineHeight", "opacity", "order",
  "orphans", "scale", "tabSize", "widows", "zIndex", "zoom", "fillOpacity", "floodOpacity", "stopOpacity",
  "strokeDasharray", "strokeDashoffset", "strokeMiterlimit", "strokeOpacity", "strokeWidth"
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
 * for reactive values, or when a conditional at-rule body contains direct style declarations with no
 * selector in scope — nest selectors under the at-rule.
 * @returns Always returns empty string (for backward compatibility), on both platforms.
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
 * a conditional at-rule body containing direct style declarations throws.
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
 * @param isGlobal Whether styles are applied globally (no selector wrapping)
 */
export function process(obj: CSSObject, selector: string, isGlobal: boolean): string {
  const rules: string[] = [];
  const properties: string[] = [];
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
          ? process(value as CSSObject, selector, isGlobal)
          : process(value as CSSObject, "", true);
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

        rules.push(process(value as CSSObject, nestedSelector, isGlobal));
      }
    } else {
      if (isFunction(value)) {
        throw new Error(`[css] function values are not supported in css objects — use vars() for reactive values, key: ${key}`);
      }
      const isCustom = key.startsWith("--");
      const property = isCustom ? key : key.replace(CAMEL_REGEX, (match) => `-${match.toLowerCase()}`);
      let cssValue: string;
      if (Array.isArray(value)) {
        cssValue = value.join(", ");
      } else if (isNumber(value) && !isCustom && !UNITLESS_PROPERTIES.has(key)) {
        cssValue = `${value}px`;
      } else {
        cssValue = String(value);
      }

      if (property === "content" && isString(value) && !value.startsWith("\"") && !value.startsWith("'")) {
        cssValue = `"${value}"`;
      }

      properties.push(`${property}:${cssValue}`);
    }
  }

  if (properties.length === 0) return rules.join("");
  // No active selector: emit declarations bare (e.g. inside @font-face). Rules
  // come first so a brace-depth-0 split keeps valid rules separate from any
  // brace-less garbage the platform will reject.
  if (!selector) return `${rules.join("")}${properties.join(";")}`;
  return `${selector}{${properties.join(";")}}${rules.join("")}`;
}
