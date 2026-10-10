import { hostQualifier, removeRule, upsertRule } from "./sheet";
import { splitTopLevelRules } from "./shared";

/**
 * id attribute of the `<style>` element all css()/style() rules inject into.
 * @internal
 */
export const STYLE_ID = "hella-css";

/**
 * @internal
 * Reference count plus the number of top-level rules the text splits into
 * (for surgical CSSOM removal at zero refs).
 */
export interface InjectedEntry {
  count: number;
  ruleCount: number;
}

/**
 * @internal
 * Text is the identity: the same CSS object always produces the same cssText,
 * so the text doubles as the dedup key. Keys are host-qualified — a per-call
 * `host` prefixes its serial (`#n`) so the same text in two hosts injects into
 * both; the default document host keeps the bare-text key. Replaces the former
 * refCounts + inlineCache + cssRulesMap + ruleCounts.
 */
export const injectedMap = new Map<string, InjectedEntry>();

/**
 * @internal
 * The shared registration flow behind `css()` and `style()`: dedups by the
 * host-qualified text (refCount++ on a hit); on a miss, splits the text into
 * top-level rules at brace-depth boundaries — braces inside quoted CSS
 * strings never count toward depth, and an unquoted `;` at depth 0 ends a
 * block-less statement segment (@import carries no braces) — injects each,
 * and stores the entry. Registration state runs on both platforms — sheet mutation is the
 * only document-gated step (a no-op without a DOM), which is what `cssText()`
 * collects on the server.
 * @param cssText Emitted rule text — the identity key
 * @param host Optional node whose sheet receives the rules instead of `document.head`
 */
export function registerText(cssText: string, host?: ParentNode): void {
  const qualified = `${hostQualifier(host)}${cssText}`;
  const existing = injectedMap.get(qualified);
  if (existing) {
    existing.count++;
    return;
  }

  const rules = splitTopLevelRules(cssText);

  let ri = 0;
  const rlen = rules.length;
  while (ri < rlen) {
    upsertRule(STYLE_ID, `${cssText}:${ri}`, rules[ri]!, host);
    ri++;
  }

  injectedMap.set(qualified, { count: 1, ruleCount: rules.length });
}

/**
 * @internal
 * The shared decrement flow behind the removers (`removeCss`, `removeStyle`,
 * `removeKeyframes`): locates the host-qualified entry, decrements its count,
 * and at zero refs drops the entry plus its CSSOM rules (a no-op without a DOM).
 * @param cssText Rule text matching the registered identity key
 * @param host Optional node whose sheet the rules were injected into
 */
export function deregisterText(cssText: string, host?: ParentNode): void {
  const qualified = `${hostQualifier(host)}${cssText}`;
  const entry = injectedMap.get(qualified);
  if (!entry) return;

  entry.count--;
  if (entry.count > 0) return;

  let i = 0;
  const ruleCount = entry.ruleCount;
  while (i < ruleCount) {
    removeRule(STYLE_ID, `${cssText}:${i}`, host);
    i++;
  }
  injectedMap.delete(qualified);
}
