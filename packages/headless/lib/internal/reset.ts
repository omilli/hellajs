import { resetHoverIntentState } from "../hoverIntent";
import { resetLayerStack } from "../layerDismissal";
import { resetToastState } from "../toast";

/**
 * Resets all Headless package mutable state — the shared hover-intent skip-delay clock, the shared dismissal layer stack, and the toast queue.
 */
export function resetHeadless() {
  resetHoverIntentState();
  resetLayerStack();
  resetToastState();
}
