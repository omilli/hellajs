/**
 * DOM node cleanup system for reactive effects and delegated events.
 *
 * Stores effects and event handlers directly on DOM elements and automatically
 * disposes them when nodes are detached from the document. Cleanup is triggered
 * by a MutationObserver that processes removed nodes immediately.
 */
import { effect } from "@hellajs/core";
import type { HellaElement } from "./types";

/**
 * Property keys for storing framework data on elements.
 */
const EFFECTS_KEY = "__hella_effects" as const;
export const HANDLERS_KEY = "__hella_handlers" as const;

/**
 * Cleanup coordination flags and queue.
 */
let isCleaning = false;
let cleanupScheduled = false;
const cleanupQueue = new Set<Node>();

/**
 * Mount coordination flags and queue.
 */
let isMounting = false;
let mountScheduled = false;
const mountQueue = new Set<Node>();

/**
 * Process all queued nodes for cleanup.
 * Executes cleanup in a non-blocking deferred manner.
 */
function processCleanupQueue() {
  if (isCleaning) return;
  isCleaning = true;
  cleanupScheduled = false;

  const nodes = Array.from(cleanupQueue);
  cleanupQueue.clear();

  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i++];
    // Nodes that still have a parent are still part of the tree; skip cleanup for moves.
    if ((node as ChildNode).isConnected || (node as ChildNode).parentNode) continue;
    cleanWithDescendants(node);
  }

  isCleaning = false;
}

/**
 * Process all queued nodes for mounting.
 * Executes mount callbacks asynchronously after nodes are in the DOM.
 */
function processMountQueue() {
  if (isMounting) return;
  isMounting = true;
  mountScheduled = false;

  const nodes = Array.from(mountQueue);
  mountQueue.clear();

  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i++];
    // Only mount nodes that are actually connected to the DOM
    if (!(node as ChildNode).isConnected) continue;
    mountWithDescendants(node);
  }

  isMounting = false;
}

/**
 * Single global MutationObserver that detects node removals and queues them for cleanup.
 * Defers actual cleanup to avoid blocking the main thread during mass node removal.
 */
const observer = new MutationObserver((mutationsList) => {
  let i = 0;
  while (i < mutationsList.length) {
    const { removedNodes, addedNodes } = mutationsList[i++];
    let j = 0;
    while (j < removedNodes.length)
      cleanupQueue.add(removedNodes[j++]);
    j = 0;
    while (j < addedNodes.length) {
      const node = addedNodes[j++];
      mountQueue.add(node);
    }
  }

  if (!cleanupScheduled) {
    cleanupScheduled = true;
    setTimeout(processCleanupQueue, 0);
  }

  if (!mountScheduled) {
    mountScheduled = true;
    setTimeout(processMountQueue, 0);
  }
});

/**
 * Dispose effects and clear events for a node.
 * Safe to call multiple times.
 * @param node Node to clean
 */
function clean(node: Node) {
  const element = node as HellaElement;
  element.__hella_at?.beforeDestroy?.();

  const effects = element[EFFECTS_KEY];
  effects?.forEach((fn: () => void) => fn());
  delete element[EFFECTS_KEY];

  delete element[HANDLERS_KEY];

  delete element.__hella_mounted;
  element.__hella_at?.destroy?.();
  delete element.__hella_at;
}

/**
 * Mount a node and all its descendants recursively.
 * @param node Root node to mount
 */
function mountWithDescendants(node: Node) {
  const element = node as HellaElement;
  element.__hella_mounted = true;
  element.__hella_at?.mount?.();

  if (node.nodeType === 1 && node.hasChildNodes()) {
    const children = node.childNodes;
    let i = 0;
    while (i < children.length) {
      mountWithDescendants(children[i++]);
    }
  }
}

/**
 * Clean a node and all its descendants recursively.
 * @param node Root node to clean
 */
function cleanWithDescendants(node: Node) {
  clean(node);

  if (node.nodeType === 1 && node.hasChildNodes()) {
    const children = node.childNodes;
    let i = 0;
    while (i < children.length) {
      cleanWithDescendants(children[i++]);
    }
  }
}

observer.observe(document.body, {
  childList: true,
  subtree: true
});

/**
 * Register a reactive effect for a node.
 * The effect disposer is stored and invoked during cleanup.
 * @param node Host DOM node
 * @param effectFn Effect function to execute reactively
 */
export function addRegistryEffect(element: HellaElement, effectFn: () => void, parent?: HellaElement) {
  element[EFFECTS_KEY] = element[EFFECTS_KEY] || new Set();
  element[EFFECTS_KEY].add(effect(() => {
    const lifecycleElement = parent || element;
    const isMounted = lifecycleElement?.__hella_mounted;
    isMounted && lifecycleElement?.__hella_at?.beforeUpdate?.();
    effectFn();
    isMounted && lifecycleElement?.__hella_at?.update?.();
  }));
}

/**
 * Register an event handler for a node.
 * Used by the global event delegation system for lookup and cleanup.
 * @param node Host DOM node
 * @param type Event type (e.g., "click")
 * @param handler Event listener
 */
export function addRegistryEvent(element: HellaElement, type: string, handler: EventListener) {
  element[HANDLERS_KEY] = element[HANDLERS_KEY] || {};
  element[HANDLERS_KEY][type] = handler;
}
/**
 * Manually queue and process mounts. For testing purposes only.
 * @internal
 */
export function flushMountQueue(root: Node = document.body) {
  // Only add direct children to queue; mountWithDescendants will handle recursion
  if (root.hasChildNodes()) {
    const children = root.childNodes;
    let i = 0;
    while (i < children.length) {
      mountQueue.add(children[i++]);
    }
  }
  processMountQueue();
}

/**
 * Manually process cleanup queue. For testing purposes only.
 * @internal
 */
export function flushCleanupQueue() {
  if (cleanupScheduled) {
    processCleanupQueue();
  }
}

/**
 * Manually queue a node for cleanup and process. For testing purposes only.
 * @internal
 */
export function queueCleanup(node: Node) {
  cleanupQueue.add(node);
  processCleanupQueue();
}