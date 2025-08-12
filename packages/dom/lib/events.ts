import { addElementEvent, getElementEvents } from "./cleanup";
import type { HellaElement } from "./types";
import { DOC } from "./utils";

const globalListeners = new Set<string>();

/**
 * Sets an event handler for a node, using a global delegated event listener.
 * @param element The DOM element.
 * @param type The event type (e.g., 'click').
 * @param handler The event handler function.
 */
export function setNodeHandler(element: HellaElement, type: string, handler: EventListener) {
  if (!globalListeners.has(type)) {
    globalListeners.add(type);
    DOC.body.addEventListener(type, delegatedHandler, true);
  }
  addElementEvent(element, type, handler);
}

/**
 * The master event handler that delegates events to the appropriate elements.
 * @param event The event object.
 */
function delegatedHandler(event: Event) {
  let element = event.target as HellaElement | null;
  while (element) {
    const events = getElementEvents(element);
    if (events && events.has(event.type)) {
      events.get(event.type)!.call(element, event);
    }
    element = element.parentNode as HellaElement;
  }
}