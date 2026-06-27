import { hasDocument } from "./internal/core";
import { resetSheet } from "./internal/sheet";
import { STYLE_ID, refCounts, inlineCache, cssRulesMap, ruleCounts } from "./internal/cssStore";

/**
 * Clears all CSS rules, caches, and resets the CSS system to initial state.
 */
export function resetCss() {
  inlineCache.clear();
  refCounts.clear();
  cssRulesMap.clear();
  ruleCounts.clear();
  if (hasDocument()) resetSheet(STYLE_ID);
}
