import { injectedMap } from "./internal/injection";
import { varsText } from "./internal/vars";

/**
 * A host qualifier is `#` plus the host serial (digits only). Valid CSS text
 * never starts with `#` + digit — an ID selector's identifier cannot begin
 * with a digit — so this discriminates hosted keys from a text that merely
 * starts with an ID selector.
 */
const HOSTED_KEY = /^#\d/;

/**
 * True when the text opens with a block-less statement segment (`@import …;`):
 * an unquoted ";" lands before the first "{" — statements never carry braces.
 * Quote-aware, so a brace or semicolon inside a statement's own string value
 * (an imported URL) cannot misclassify the text.
 */
function startsWithStatement(text: string): boolean {
  let i = 0;
  let quote: string | null = null;
  const len = text.length;
  while (i < len) {
    const ch = text[i++] as string;
    if (quote !== null) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ";") return true;
    else if (ch === "{") return false;
  }
  return false;
}

/**
 * Collects the CSS text registered by `css()`, `style()`, `keyframes()`, and
 * `vars()` calls on the default host, in first-registration order (the vars
 * contribution appends after the css-side text — the `hella-vars` sheet
 * mirrors the two-element client model). Statement-leading texts hoist ahead
 * of braced-only texts within that order, so the server `<style>` keeps
 * statements ahead of every rule, mirroring the client's before-braced
 * placement. A peek, never a drain: repeated
 * calls return the same string until `resetCss()` / `resetVars()` clear the
 * registrations. Identical on both platforms — registration runs without a
 * DOM, so this is the server-side `<style>` source
 * (`<style>${cssText()}</style>`).
 * Host-qualified entries are excluded: their rules live in host sheets
 * (e.g. shadow roots), not `document.head`.
 * @returns The joined rule text of all default-host registrations
 */
export function cssText(): string {
  let statements = "";
  let braced = "";
  injectedMap.forEach((_entry, key) => {
    if (HOSTED_KEY.test(key)) return;
    if (startsWithStatement(key)) statements += key;
    else braced += key;
  });
  return statements + braced + varsText();
}
