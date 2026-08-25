import { hasDocument } from "./core";

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
 * so the text doubles as the dedup key. Replaces the former refCounts +
 * inlineCache + cssRulesMap + ruleCounts.
 */
export const injectedMap = new Map<string, InjectedEntry>();

/**
 * @internal
 * Mirrors the current CSS rules text into the style element for DevTools visibility.
 * Joins every injected text — the same values the CSSOM holds, in insertion order.
 */
export function syncTextContent(): void {
  if (!hasDocument()) return;
  const el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (el) {
    el.textContent = Array.from(injectedMap.keys()).join("");
  }
}
