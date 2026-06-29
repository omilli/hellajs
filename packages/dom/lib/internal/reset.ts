import { resetQueueState } from "./queue";
import { resetEventState } from "./events";
import { resetSelectorState } from "./selectors";
import { resetErrorState } from "./dispatch";
import { clearStaticCache } from "./render";

/**
 * @internal
 * Resets all DOM package mutable state — queues, scheduling flags, observers, selector registry, event listeners, delegated handler types, and error handlers.
 */
export function resetDom() {
  resetQueueState();
  resetEventState();
  resetSelectorState();
  resetErrorState();
  clearStaticCache();
}
