import type { NodeRegistry } from "./types";

const registry = new WeakMap<Node, NodeRegistry>();

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

function cleanNodeRegistry(node?: Node) {
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
}

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.removedNodes.forEach(removedNode => {
      if (removedNode.nodeType === Node.ELEMENT_NODE) {
        const element = removedNode as Element;

        cleanNodeRegistry(element);

        element.querySelectorAll('*').forEach(descendant => {
          cleanNodeRegistry(descendant);
        });
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});