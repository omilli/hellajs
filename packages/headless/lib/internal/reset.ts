import { resetHoverIntentState } from "../hoverIntent";
import { resetLayerStack } from "../layerDismissal";

/**
 * Resets all Headless package mutable state — the shared hover-intent skip-delay clock and the shared dismissal layer stack.
 */
export function resetHeadless() {
  resetHoverIntentState();
  resetLayerStack();
}
