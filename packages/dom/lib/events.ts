import { addElementEvent, getElementEvents } from "./cleanup";
import { DOC } from "./utils";

const globalListeners = new Set<string>();

export function setNodeHandler(node: Node, type: string, handler: EventListener) {
  if (!globalListeners.has(type)) {
    globalListeners.add(type);
    DOC.body.addEventListener(type, delegatedHandler, true);
  }
  addElementEvent(node, type, handler);
}

function delegatedHandler(event: Event) {
  let node = event.target as Node | null;
  while (node) {
    const events = getElementEvents(node);
    if (events && events.has(event.type)) {
      events.get(event.type)!.call(node, event);
    }
    node = node.parentNode;
  }
}