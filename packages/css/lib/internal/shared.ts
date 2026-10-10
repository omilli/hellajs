import { isObject } from "./core";

/**
 * One indentation level of the pretty-printed emission: two spaces.
 */
const INDENT = "  ";

/**
 * @internal
 * The `n`-level indentation prefix every emission line at depth `n` carries.
 */
export function pad(n: number): string {
  return INDENT.repeat(n);
}

/**
 * @internal
 * Wraps a body in a pretty-printed block at the given nesting depth: indented
 * `head {`, body one level deeper, closing `}` realigned with the head. An
 * empty body emits the inline empty block (a null-only at-rule body, an empty
 * object).
 */
export function wrapBlock(head: string, body: string, indent = 0): string {
  return body ? `${pad(indent)}${head} {\n${body}\n${pad(indent)}}` : `${pad(indent)}${head} {}`;
}

/**
 * @internal
 * Splits CSS text into its top-level rules at brace-depth boundaries: braces
 * inside quoted CSS strings never count toward depth, and an unquoted `;` at
 * depth 0 ends a block-less statement segment (@import carries no braces).
 * A non-empty trailing tail (text not ending on a segment boundary) is a
 * final segment. Shared by registration (one emission injects as several
 * CSSOM rules) and adoption (delivered sheet text splits into the same
 * segments the client re-registers).
 */
export function splitTopLevelRules(cssText: string): string[] {
  const rules: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  let quote: string | null = null;
  const len = cssText.length;
  while (i < len) {
    const ch = cssText[i++] as string;
    if (quote !== null) {
      // A backslash escapes the next character inside a CSS string.
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        rules.push(cssText.slice(start, i));
        start = i;
      }
    } else if (ch === ";" && depth === 0) {
      // A depth-0 ";" ends a block-less statement segment (statements carry
      // no braces). Declaration text never hits this boundary: top-level bare
      // declarations throw in process(), nested ones sit at depth >= 1.
      rules.push(cssText.slice(start, i));
      start = i;
    }
  }
  if (start < len) rules.push(cssText.slice(start));
  return rules;
}

/**
 * @internal
 * Stringifies an object for hashing.
 */
export function stringify(obj: unknown): string {
  if (!isObject(obj)) return String(obj);

  const keys = Object.keys(obj).sort();
  const pairs = [];
  let i = 0;
  const len = keys.length;
  while (i < len) {
    pairs.push(`${keys[i]}:${stringify((obj as Record<string, unknown>)[keys[i] as string])}`);
    i++;
  }
  return `{${pairs.join(",")}}`;
}

/**
 * @internal
 * Computes a DJB2 hash from a string, re-encoded as bijective base-26:
 * the output is always one or more `[a-z]` letters — a valid CSS identifier
 * on its own — and the encoding is injective on the unsigned 32-bit domain,
 * so distinct hashes never collide on a class name.
 */
export function hash(str: string): string {
  let h = 5381;
  let i = str.length;
  while (i) h = (h * 33) ^ str.charCodeAt(--i);
  let n = h >>> 0;
  let s = "";
  do {
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26);
  } while (n);
  return s;
}
