import { addRegistryEvent, nodeRegistry } from "./registry";
import { DOC } from "./utils";

const globalListeners = new Set<string>();


export function setNodeHandler(node: Node, type: string, handler: EventListener) {
  if (!globalListeners.has(type)) {
    globalListeners.add(type);
    DOC.body.addEventListener(type, delegatedHandler, true);
  };
  addRegistryEvent(node, type, handler);
}

function delegatedHandler(event: Event) {
  let node = event.target as Node | null;
  while (node) {
    const events = nodeRegistry(node)?.events;
    if (events && events.has(event.type)) {
      events.get(event.type)!.call(node, event);
    }
    node = node.parentNode;
  }
}