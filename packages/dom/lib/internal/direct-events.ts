import type { HellaElement } from "../types/nodes.d.ts";

const DIRECT_HANDLERS_KEY = "__hella_direct_handlers";

/**
 * Sets a direct (non-delegated) event handler on a DOM element.
 * Unlike delegated handlers, these are attached directly to the element.
 * @param element The DOM element to attach the handler to
 * @param type The event type (e.g., 'click', 'input', 'submit')
 * @param handler The event handler function to execute
 */
export function setDirectHandler(element: HellaElement, type: string, handler: EventListener) {
  let handlers = element[DIRECT_HANDLERS_KEY];
  if (!handlers) {
    handlers = element[DIRECT_HANDLERS_KEY] = new Map();
  }

  const existing = handlers.get(type);
  if (existing) {
    element.removeEventListener(type, existing);
  }

  element.addEventListener(type, handler);
  handlers.set(type, handler);
}

/**
 * Removes all direct handlers from an element.
 * Called by cleanup system during node removal.
 * @param element The DOM element to remove handlers from
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
