import { effect } from "@hellajs/core";
import type { NodeRegistry } from "./types";


/**
 * A map that associates DOM nodes with their registry data for effects and events.
 * Used for tracking cleanup responsibilities per node.
 */
const registry = new Map<Node, NodeRegistry>();

/**
 * Flag indicating if cleanup is currently running to prevent concurrent executions.
 */
let cleanupRunning = false;

/**
 * Flag indicating if cleanup should be run, set by mutations or manual triggers.
 */
let shouldRunCleanup = false;

/**
 * Retrieves or initializes the registry for a given DOM node.
 * If the node doesn't have a registry, it creates an empty one and returns it.
 * @param node - The DOM node to get the registry for.
 * @returns The NodeRegistry object associated with the node.
 */
export function nodeRegistry(node: Node): NodeRegistry {
  return registry.get(node) || registry.set(node, {}).get(node)!;
}

/**
 * Adds an event handler to the registry for a specific DOM node and event type.
 * This allows for centralized event management and cleanup.
 * @param node - The DOM node to associate the event with.
 * @param type - The event type (e.g., 'click').
 * @param handler - The event listener function.
 */
export function addRegistryEvent(node: Node, type: string, handler: EventListener) {
  nodeRegistry(node).events = nodeRegistry(node).events || new Map();
  nodeRegistry(node).events?.set(type, handler);
}

/**
 * Adds an effect function to the registry for a specific DOM node.
 * The effect is wrapped in a core effect and will be cleaned up when the node is removed.
 * @param node - The DOM node to associate the effect with.
 * @param effectFn - The effect function to run and track.
 */
export function addRegistryEffect(node: Node, effectFn: () => void) {
  nodeRegistry(node).effects = nodeRegistry(node).effects || new Set();
  nodeRegistry(node).effects?.add(effect(() => {
    effectFn();
    shouldRunCleanup = true;
  }));
}

/**
 * Cleans up the registry for a specific node or all disconnected nodes.
 * If a node is provided, it cleans up its effects and events.
 * If no node is provided, it triggers a global cleanup for disconnected nodes.
 * @param node - Optional DOM node to clean up. If omitted, cleans up all disconnected nodes.
 */
export function cleanNodeRegistry(node: Node) {
  const { effects, events } = nodeRegistry(node);
  if (effects) {
    effects.forEach(fn => fn());
    effects.clear();
  }
  events && events?.clear();
  registry.delete(node);
}

/**
 * MutationObserver that monitors DOM changes to trigger cleanup for removed nodes.
 * Observes childList changes on the document body and subtree for automatic cleanup.
 */
const observer = new MutationObserver(() => {
  if (cleanupRunning || !shouldRunCleanup) return;
  cleanupRunning = true;
  queueMicrotask(() => {
    registry.forEach((_, node) => !node.isConnected && cleanNodeRegistry(node));
    cleanupRunning = false;
    shouldRunCleanup = false;
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});