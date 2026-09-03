import { hasDocument } from "./internal/core";
import { resetSheet } from "./internal/sheet";
import { STYLE_ID, injectedMap } from "./internal/injection";

/**
 * Clears all CSS rules and resets the CSS system to initial state.
 * Clears the registration state on both platforms; the sheet reset is
 * DOM-only (a no-op without a document).
 */
export function resetCss(): void {
  injectedMap.clear();
  if (hasDocument()) resetSheet(STYLE_ID);
}
