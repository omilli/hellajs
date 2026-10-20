import type { DirectListenerSpec } from "../types/nodes";
import { dispatchError, resolveErrorConfig, toError } from "../internal/dispatch";
import { getState } from "../internal/state";
import { renderEventFallback, setDirectEventFeature } from "../internal/events";

/**
 * Sets a direct (non-delegated) event handler on an element.
 * Wraps handler with error boundary support - catches errors and
 * renders fallback UI if configured.
 * Replaces existing handler for same event type.
 * @param element Target element
 * @param type Event type (e.g., 'focus', 'blur', 'load')
 * @param handler Event handler function, or a `{ handler, options }` spec whose
 * native listener options (once/passive/capture) are forwarded to addEventListener
 */
function bindDirectHandler(
  element: Element,
  type: string,
  handler: EventListener | DirectListenerSpec,
) {
  const state = getState(element);
  const handlers = state.directHandlers ?? (state.directHandlers = new Map());

  const isSpec = "handler" in handler;
  const listener = isSpec ? handler.handler : handler;
  const options = isSpec ? handler.options : undefined;

  const wrappedHandler = (event: Event) => {
    try {
      listener.call(element, event);
    } catch (e) {
      const config = resolveErrorConfig(element);
      const fallback = dispatchError(toError(e), { phase: "event", element, event, config });
      if (fallback) renderEventFallback(element, fallback);
    }
  };

  const prev = handlers.get(type);
  if (prev) element.removeEventListener(type, prev.handler, prev.options);

  element.addEventListener(type, wrappedHandler, options);
  handlers.set(type, { handler: wrappedHandler, options });
}

/**
 * Removes all direct handlers from an element.
 * Called during cleanup when element is removed from DOM.
 * @param node Node to cleanup
 * @param handlers The node's direct-handler map (caller already holds the state)
 */
function removeDirectHandlers(node: Node, handlers: Map<string, DirectListenerSpec>) {
  const iter = handlers.keys();
  let result = iter.next();
  while (!result.done) {
    const key = result.value;
    const stored = handlers.get(key)!;
    node.removeEventListener(key, stored.handler, stored.options);
    result = iter.next();
  }
  handlers.clear();
}

setDirectEventFeature({ bindDirectHandler, removeDirectHandlers });
