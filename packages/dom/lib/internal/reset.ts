import { resetQueueState } from "./queue";
import { resetEventState } from "./events";
import { resetSelectorState } from "./selectors";
import { resetErrorState } from "./dispatch";
import { resetHydrateState } from "./hydrate";

/**
 * Resets all DOM package mutable state — queues, scheduling flags, observers, selector registry, event listeners, delegated handler types, error handlers, and the hydration context stack, plus the deferred selective-hydration regions (registry + watch).
 */
export function resetDom() {
  resetQueueState();
  resetEventState();
  resetSelectorState();
  resetErrorState();
  resetHydrateState();
}
