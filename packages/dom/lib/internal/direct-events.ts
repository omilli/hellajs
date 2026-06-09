import type { HellaElement } from "../types/nodes";
import { dispatchError, findBoundary, resolveErrorConfig, toError, getMountNode } from "../error";

const DIRECT_HANDLERS_KEY = "__hella_direct_handlers";

/**
 * Sets a direct (non-delegated) event handler on an element.
 * Wraps handler with error boundary support - catches errors and
 * renders fallback UI if configured.
 * Replaces existing handler for same event type.
 * @param element Target element
 * @param type Event type (e.g., 'focus', 'blur', 'load')
 * @param handler Event handler function
 */
export function setDirectHandler(element: HellaElement, type: string, handler: EventListener) {
  let handlers = element[DIRECT_HANDLERS_KEY];
  if (!handlers) {
    handlers = element[DIRECT_HANDLERS_KEY] = new Map();
  }

  // Remove existing handler for this type
  const existing = handlers.get(type);
  if (existing) {
    element.removeEventListener(type, existing);
  }

  // Wrap handler with error handling
  const wrappedHandler = (event: Event) => {
    try {
      handler.call(element, event);
    } catch (e) {
      const config = resolveErrorConfig(element);
      const fallback = dispatchError(toError(e), { phase: 'event', element, event, config });
      if (fallback) {
        const target = findBoundary(element) ?? element;
        const mountNode = getMountNode();
        if (mountNode) target.replaceChildren(mountNode(fallback));
      }
    }
  };

  element.addEventListener(type, wrappedHandler);
  handlers.set(type, wrappedHandler);
}

/**
 * Removes all direct handlers from an element.
 * Called during cleanup when element is removed from DOM.
 * @param element Element to cleanup
 */
export function removeDirectHandlers(element: HellaElement) {
  const handlers = element[DIRECT_HANDLERS_KEY];
  if (!handlers) return;

  for (const [type, handler] of handlers) {
    element.removeEventListener(type, handler);
  }

  handlers.clear();
  delete element[DIRECT_HANDLERS_KEY];
}
