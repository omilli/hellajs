import { resetQueueState } from "./queue";
import { resetEventState } from "./events";
import { resetSelectorState } from "./selectors";
import { resetErrorState } from "./dispatch";
import { clearStaticCache } from "./render";
import { resetHydrateState } from "./hydrate";
import { resetHoverIntentState } from "../hoverIntent";
import { resetLayerStack } from "../layerDismissal";

/**
 * Resets all DOM package mutable state — queues, scheduling flags, observers, selector registry, event listeners, delegated handler types, error handlers, the hydration context stack, the deferred selective-hydration regions (registry + watch), the shared hover-intent skip-delay clock, and the shared dismissal layer stack.
 */
export function resetDom() {
  resetQueueState();
  resetEventState();
  resetSelectorState();
  resetErrorState();
  clearStaticCache();
  resetHydrateState();
  resetHoverIntentState();
  resetLayerStack();
}
