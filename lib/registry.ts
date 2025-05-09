interface NodeRegistry {
  effects?: Set<() => void>;
  events?: Map<string, EventListener>;
}

const registry = new Map<Node, NodeRegistry>();

export function nodeRegistry(node: Node): NodeRegistry {
  let nodeRef = registry.get(node);

  if (!nodeRef) {
    registry.set(node, {});

    return nodeRegistry(node);
  }

  return nodeRef;
}

export function getNodeRegistry(node: Node): NodeRegistry | undefined {
  return registry.get(node);
}

export function addRegistryEvent(node: Node, type: string, handler: EventListener) {
  const events = nodeRegistry(node).events;
  if (!events) {
    nodeRegistry(node).events = new Map();
  }
  nodeRegistry(node).events?.set(type, handler);
}

export function addRegistryEffect(node: Node, effect: () => void) {
  const effects = nodeRegistry(node).effects;
  if (!effects) {
    nodeRegistry(node).effects = new Set();
  }
  nodeRegistry(node).effects?.add(effect);
}

let isRunning = false;

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
  }


  if (isRunning) return;
  isRunning = true;

  queueMicrotask(() => {
    registry.forEach((_, node) => {
      if (!node.isConnected) {
        cleanNodeRegistry(node);
      }
    });
    isRunning = false;
  })
}