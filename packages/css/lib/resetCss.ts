import { hasDocument } from "./internal/core";
import { resetSheet } from "./internal/sheet";
import { STYLE_ID, injectedMap } from "./internal/cssStore";

/**
 * Clears all CSS rules and resets the CSS system to initial state.
 * Client-only effect; a no-op when no DOM is available (server stays stateless).
 */
export function resetCss(): void {
  injectedMap.clear();
  if (hasDocument()) resetSheet(STYLE_ID);
}
