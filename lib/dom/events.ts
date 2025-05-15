import { addRegistryEvent, getNodeRegistry } from "./registry";

const globalListeners = new Set<string>();


export function setNodeHandler(node: Node, type: string, handler: EventListener) {
  registerDelegatedEvent(type);
  addRegistryEvent(node, type, handler);
}

function delegatedHandler(event: Event) {
  let node = event.target as Node | null;
  while (node) {
    const events = getNodeRegistry(node)?.events;
    if (events && events.has(event.type)) {
      events.get(event.type)!.call(node, event);
    }
    node = node.parentNode;
  }
}

function registerDelegatedEvent(type: string) {
  if (globalListeners.has(type)) return;
  globalListeners.add(type);
  document.body.addEventListener(type, delegatedHandler, true);
}