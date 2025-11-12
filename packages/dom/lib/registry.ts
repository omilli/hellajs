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
const HANDLERS_KEY = "__hella_handlers" as const;

/**
 * Cleanup coordination flags and queue.
 */
let isCleaning = false;
let cleanupScheduled = false;
const cleanupQueue = new Set<Node>();

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
 * Single global MutationObserver that detects node removals and queues them for cleanup.
 * Defers actual cleanup to avoid blocking the main thread during mass node removal.
 */
const observer = new MutationObserver((mutationsList) => {
  let i = 0;
  while (i < mutationsList.length) {
    const { removedNodes } = mutationsList[i++];
    let j = 0;
    while (j < removedNodes.length) {
      cleanupQueue.add(removedNodes[j++]);
    }
  }

  if (!cleanupScheduled) {
    cleanupScheduled = true;
    setTimeout(processCleanupQueue, 0);
  }
});

/**
 * Dispose effects and clear events for a node.
 * Safe to call multiple times.
 * @param node Node to clean
 */
function clean(node: Node) {
  const element = node as HellaElement;
  const effects = element[EFFECTS_KEY];
  if (effects) {
    effects.forEach((fn: () => void) => fn());
    delete element[EFFECTS_KEY];
  }

  if (element[HANDLERS_KEY]) {
    delete element[HANDLERS_KEY];
  }

  element.onDestroy?.();
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
export function addRegistryEffect(node: Node, effectFn: () => void) {
  if (typeof effectFn !== "function") return;

  const element = node as HellaElement;
  element[EFFECTS_KEY] = element[EFFECTS_KEY] || new Set();
  element[EFFECTS_KEY].add(effect(effectFn));
}

/**
 * Register an event handler for a node.
 * Used by the global event delegation system for lookup and cleanup.
 * @param node Host DOM node
 * @param type Event type (e.g., "click")
 * @param handler Event listener
 */
export function addRegistryEvent(node: Node, type: string, handler: EventListener) {
  const element = node as HellaElement;
  element[HANDLERS_KEY] = element[HANDLERS_KEY] || {};
  element[HANDLERS_KEY][type] = handler;
}

/**
 * Get event handlers for a node.
 * @param node Node to retrieve handlers from
 * @returns Event handlers object or undefined
 */
export function getRegistryHandlers(node: Node): Record<string, EventListener> | undefined {
  return (node as HellaElement)[HANDLERS_KEY];
}