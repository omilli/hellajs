import { injectedMap } from "./internal/injection";

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
 * @internal
 * Collects the css-side registration text — the `cssText.css()` namespace
 * member. Walks the default-host `injectedMap` keys in first-registration
 * order, skips host-qualified entries, and joins the texts with a blank
 * line, statement-leading texts hoisted ahead of braced-only ones so the
 * server `<style>` mirrors the client sheet's before-braced placement.
 * @returns The css-side text, `""` when nothing css-side is registered
 */
export function cssTextCss(): string {
  const statements: string[] = [];
  const braced: string[] = [];
  injectedMap.forEach((_entry, key) => {
    if (HOSTED_KEY.test(key)) return;
    if (startsWithStatement(key)) statements.push(key);
    else braced.push(key);
  });
  return statements.concat(braced).join("\n\n");
}
