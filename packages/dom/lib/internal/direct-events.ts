import { dispatchError, findBoundary, resolveErrorConfig, toError, getMountNode } from "../error";
import { getState, hasState } from "./element-map";

/**
 * Sets a direct (non-delegated) event handler on an element.
 * Wraps handler with error boundary support - catches errors and
 * renders fallback UI if configured.
 * Replaces existing handler for same event type.
 * @param element Target element
 * @param type Event type (e.g., 'focus', 'blur', 'load')
 * @param handler Event handler function
 */
export function setDirectHandler(element: Element, type: string, handler: EventListener) {
  const handlers = getState(element).directHandlers;

  const existing = handlers.get(type);
  if (existing) {
    element.removeEventListener(type, existing);
  }

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
export function removeDirectHandlers(node: Node) {
  if (!hasState(node)) return;
  const handlers = getState(node).directHandlers;
  const iter = handlers.keys();
  let result = iter.next();
  while (!result.done) {
    const key = result.value;
    node.removeEventListener(key, handlers.get(key)!);
    result = iter.next();
  }
  handlers.clear();
}
