import type { NodeRegistry } from "./types";

const registry = new Map<Node, NodeRegistry>();

export function nodeRegistry(node: Node): NodeRegistry {
  let nodeRef = registry.get(node);

  if (!nodeRef) {
    registry.set(node, {});

    return nodeRegistry(node);
  }

  return nodeRef;
}

export function addRegistryEvent(node: Node, type: string, handler: EventListener) {
  nodeRegistry(node).events = nodeRegistry(node).events || new Map();
  nodeRegistry(node).events?.set(type, handler);
}

export function addRegistryEffect(node: Node, effect: () => void) {
  nodeRegistry(node).effects = nodeRegistry(node).effects || new Set();
  nodeRegistry(node).effects?.add(effect);
}

let isRunning = false;
let shouldRun = false;

export function cleanNodeRegistry(node?: Node) {
  if (node) {
    const { effects, events } = nodeRegistry(node);
    if (effects) {
      effects.forEach(fn => fn());
      effects.clear();
    }
    if (events) {
      events?.clear();
    }
    registry.delete(node);
    return;
  }

  shouldRun = true;
}

setInterval(() => {
  if (isRunning || !shouldRun) return;
  isRunning = true;

  queueMicrotask(() => {
    registry.forEach((_, node) => {
      if (!node.isConnected) {
        cleanNodeRegistry(node);
      }
    });
    isRunning = false;
    shouldRun = false;
  })
}, 100);