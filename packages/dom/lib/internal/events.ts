import { registry, HANDLERS_KEY } from "../registry";
import type { HellaElement } from "../types/nodes.d.ts";

/**
 * Set of event types for which global delegated listeners have been registered.
 */
const globalListeners = new Set<string>();

/**
 * Tracks handler count per event type for fast "has any handlers" check.
 */
const handlerCounts = new Map<string, number>();

/**
 * Sets an event handler for a DOM element using global event delegation.
 * Creates a delegated listener on document.body if one doesn't exist for this event type.
 * @param element The DOM element to attach the handler to
 * @param type The event type (e.g., 'click', 'mousedown', 'keyup')
 * @param handler The event handler function to execute
 */
export function setNodeHandler(element: HellaElement, type: string, handler: EventListener) {
  // Track handler count for this event type
  const prevHandler = (element as HellaElement)[HANDLERS_KEY]?.[type];
  if (!prevHandler) {
    handlerCounts.set(type, (handlerCounts.get(type) || 0) + 1);
  }

  // Attach global listener if first of this type
  if (!globalListeners.has(type)) {
    globalListeners.add(type);
    document.body.addEventListener(type, delegatedHandler, true);
  }
  registry.addEvent(element, type, handler);
}

/**
 * Decrements handler count when an element with handlers is cleaned up.
 * Called by registry cleanup to maintain accurate counts.
 * @param handlers The handlers object from the cleaned element
 */
export function decrementHandlerCounts(handlers: Record<string, EventListener>) {
  for (const type in handlers) {
    const count = handlerCounts.get(type);
    if (count !== undefined) {
      count > 1 ? handlerCounts.set(type, count - 1) : handlerCounts.delete(type);
    }
  }
}

/**
 * Global delegated event handler that routes events to the appropriate element handlers.
 * Uses composedPath for efficient traversal and respects stopPropagation.
 * @param event The DOM event object from the browser
 */
function delegatedHandler(event: Event) {
  const type = event.type;

  // Fast exit if no handlers registered for this event type
  if (!handlerCounts.has(type)) return;

  // Use composedPath for pre-computed ancestor chain (faster than parentNode walk)
  const path = event.composedPath();
  let i = 0;
  const len = path.length;

  while (i < len) {
    const element = path[i++] as HellaElement;
    const handler = element[HANDLERS_KEY]?.[type];
    handler && handler.call(element, event);
  }
}