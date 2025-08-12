import { addElementEvent, getElementEvents } from "./cleanup";
import type { HellaElement } from "./types";
import { DOC } from "./utils";

const globalListeners = new Set<string>();

export function setNodeHandler(element: HellaElement, type: string, handler: EventListener) {
  if (!globalListeners.has(type)) {
    globalListeners.add(type);
    DOC.body.addEventListener(type, delegatedHandler, true);
  }
  addElementEvent(element, type, handler);
}

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