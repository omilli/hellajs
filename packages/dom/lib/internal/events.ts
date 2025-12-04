import { registry } from "../registry";
import { handlerCounts } from "./counts";
import type { AugmentedElement } from "../types/nodes.d.ts";

const HANDLERS_KEY = "__hella_handlers";

/**
 * Set of event types for which global delegated listeners have been registered.
 */
const globalListeners = new Set<string>();

/**
 * Sets an event handler for a DOM element using global event delegation.
 * Creates a delegated listener on document.body if one doesn't exist for this event type.
 * @param element The DOM element to attach the handler to
 * @param type The event type (e.g., 'click', 'mousedown', 'keyup')
 * @param handler The event handler function to execute
 */
export function setNodeHandler(element: AugmentedElement, type: string, handler: EventListener) {
  // Track handler count for this event type
  !(element as AugmentedElement)[HANDLERS_KEY]?.[type]
    && handlerCounts.set(type, (handlerCounts.get(type) || 0) + 1);

  // Attach global listener if first of this type
  if (!globalListeners.has(type)) {
    globalListeners.add(type);
    document.body.addEventListener(type, delegatedHandler, true);
  }
  registry.addEvent(element, type, handler);
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
    const element = path[i++] as AugmentedElement;
    const handler = element[HANDLERS_KEY]?.[type];
    handler && handler.call(element, event);
  }
}