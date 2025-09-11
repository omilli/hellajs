import { addRegistryEvent, getRegistryNode } from "./registry";
import { DOC } from "./utils";

/** Set of event types for which global delegated listeners have been registered. */
const globalListeners = new Set<string>();

/**
 * Sets an event handler for a node, using a global delegated event listener.
 * @param element The DOM element.
 * @param type The event type (e.g., 'click').
 * @param handler The event handler function.
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
 * The master event handler that delegates events to the appropriate elements.
 * @param event The event object.
 */
function delegatedHandler(event: Event) {
  let element = event.target as Node | null;
  while (element) {
    const events = getRegistryNode(element)?.events;
    events && events.has(event.type) && events.get(event.type)!.call(element, event);
    element = element.parentNode;
  }
}