/**
 * DOM node registry for reactive effects and delegated events.
 *
 * Maintains per-node metadata and automatically disposes it when nodes are
 * detached from the document. Cleanup is coordinated via a single
 * MutationObserver and batched in a microtask to minimize overhead.
 */
import { effect } from "@hellajs/core";
import type { NodeRegistry, NodeRegistryItem } from "./types";

/**
 * Mapping of DOM nodes to their registry entries.
 * Entries are created lazily on first access and removed on cleanup.
 */
const nodes = new Map<Node, NodeRegistryItem>();

/**
 * Cleanup coordination flags.
 *
 * - isCleaning: true while a cleanup batch is running to prevent re-entrancy
 * - shouldClean: set by effects to signal that cleanup should run soon
 */
let isCleaning = false, shouldClean = false;

/**
 * Single global MutationObserver that detects node removals and schedules
 * cleanup. The actual cleanup runs in a microtask to batch multiple changes.
 */
const observer = new MutationObserver(() => {
  if (isCleaning || !shouldClean) return;
  isCleaning = true;
  queueMicrotask(() => {
    nodes.forEach((_, node) => !node.isConnected && clean(node));
    isCleaning = false;
    shouldClean = false;
  });
});

/**
 * Get or create the registry entry for a node.
 * @param node DOM node to associate/retrieve metadata for
 * @returns The node's registry entry
 */
function get(node: Node): NodeRegistryItem {
  return nodes.get(node) || nodes.set(node, {}).get(node)!;
}

/**
 * Register a reactive effect for a node.
 * The effect disposer is stored and invoked during cleanup.
 * @param node Host DOM node
 * @param effectFn Effect function to execute reactively
 */
function addEffect(node: Node, effectFn: () => void) {
  get(node).effects = get(node).effects || new Set();
  get(node).effects!.add(effect(() => {
    effectFn();
    shouldClean = true;
  }));
}

/**
 * Register an event handler for a node.
 * Used by the global event delegation system for lookup and cleanup.
 * @param node Host DOM node
 * @param type Event type (e.g., "click")
 * @param handler Event listener
 */
function addEvent(node: Node, type: string, handler: EventListener) {
  get(node).events = get(node).events || new Map();
  get(node).events!.set(type, handler);
}

/**
 * Dispose effects and clear events for a node, then remove it from the registry.
 * Safe to call multiple times.
 * @param node Node to clean
 */
function clean(node: Node) {
  const { effects, events } = get(node);
  effects?.forEach(fn => fn());
  effects?.clear();
  events && events?.clear();
  nodes.delete(node);
}

observer.observe(document.body, {
  childList: true,
  subtree: true
});

/**
 * Public registry API used by the DOM package.
 */
export const nodeRegistry: NodeRegistry = Object.freeze({
  nodes,
  get,
  addEffect,
  addEvent,
  clean,
  observer
});