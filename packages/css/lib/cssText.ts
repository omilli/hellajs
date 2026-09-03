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
 * Collects the CSS text registered by `css()`, `style()`, `keyframes()`, and
 * `vars()` calls on the default host, in first-registration order (the vars
 * contribution appends after the css-side text — the `hella-vars` sheet
 * mirrors the two-element client model). A peek, never a drain: repeated
 * calls return the same string until `resetCss()` / `resetVars()` clear the
 * registrations. Identical on both platforms — registration runs without a
 * DOM, so this is the server-side `<style>` source
 * (`<style>${cssText()}</style>`).
 * Host-qualified entries are excluded: their rules live in host sheets
 * (e.g. shadow roots), not `document.head`.
 * @returns The joined rule text of all default-host registrations
 */
export function cssText(): string {
  let text = "";
  injectedMap.forEach((_entry, key) => {
    if (!HOSTED_KEY.test(key)) text += key;
  });
  return text + varsText();
}
