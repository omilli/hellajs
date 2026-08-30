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
