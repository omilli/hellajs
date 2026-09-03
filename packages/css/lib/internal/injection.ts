import { hostQualifier, upsertRule } from "./sheet";

/**
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
 * top-level rules at brace-depth boundaries, injects each, and stores the
 * entry. Registration state runs on both platforms — sheet mutation is the
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

  // Split into individual top-level rules at brace-depth boundaries.
  const rules: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  const len = cssText.length;
  while (i < len) {
    const ch = cssText[i++] as string;
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
    upsertRule(STYLE_ID, `${cssText}:${ri}`, rules[ri]!, host);
    ri++;
  }

  injectedMap.set(qualified, { count: 1, ruleCount: rules.length });
}
