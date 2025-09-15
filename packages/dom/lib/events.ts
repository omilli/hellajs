import { addRegistryEvent, getRegistryNode } from "./registry";
import { DOC } from "./utils";

/** Set of event types for which global delegated listeners have been registered. */
const globalListeners = new Set<string>();

/**
 * Sets an event handler for a DOM element using global event delegation.
 * Creates a delegated listener on document.body if one doesn't exist for this event type.
 * @param element The DOM element to attach the handler to.
 * @param type The event type (e.g., 'click', 'mousedown', 'keyup').
 * @param handler The event handler function to execute.
 */
export function setNodeHandler(element: Node, type: string, handler: EventListener) {
  // Always attach delegated event listeners to document.body
  if (!globalListeners.has(type)) {
    globalListeners.add(type);
    DOC.body.addEventListener(type, delegatedHandler, true);
  }
  addRegistryEvent(element, type, handler);
}

/**
 * Global delegated event handler that routes events to the appropriate element handlers.
 * Walks up the DOM tree from the event target, checking each element for registered handlers.
 * This enables efficient event handling with a single listener per event type.
 * @param event The DOM event object from the browser.
 */
function delegatedHandler(event: Event) {
  let element = event.target as Node | null;
  while (element) {
    const events = getRegistryNode(element)?.events;
    events && events.has(event.type) && events.get(event.type)!.call(element, event);
    element = element.parentNode;
  }
}