/**
 * DOM node cleanup system for reactive effects and delegated events.
 *
 * Stores effects and event handlers directly on DOM elements and automatically
 * disposes them when nodes are detached from the document. Cleanup is triggered
 * by a MutationObserver that processes removed nodes immediately.
 */
import { effect } from "./core";
import type { HellaElement, HookStacks, HookType } from "../types";

/**
 * Property keys for storing framework data on elements.
 */
const EFFECTS_KEY = "__hella_effects" as const;
export const HANDLERS_KEY = "__hella_handlers" as const;
const HOOKS_KEY = "__hella_hooks" as const;

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
 * Pending element selectors waiting for DOM availability.
 * Maps CSS selectors to arrays of operations to execute when element appears.
 */
type PendingOp = (node: Element) => void;
const pendingSelectors = new Map<string, PendingOp[]>();
let pendingCheckScheduled = false;

/**
 * Get or create the hook stacks for an element.
 * @param element The DOM element
 */
function getHookStacks(element: HellaElement): HookStacks {
  if (!element[HOOKS_KEY]) {
    element[HOOKS_KEY] = {
      beforeMount: [],
      mount: [],
      beforeDestroy: [],
      destroy: [],
      beforeUpdate: [],
      update: [],
    };
  }
  return element[HOOKS_KEY];
}

/**
 * Add a hook to an element's stack.
 * @param element The DOM element
 * @param type The hook type
 * @param fn The callback function
 */
export function addHook(
  element: HellaElement,
  type: HookType,
  fn: () => void
) {
  const stacks = getHookStacks(element);
  stacks[type].push(fn);
}

/**
 * Register an operation to execute when a selector matches.
 * Queues operations for elements not yet in the DOM.
 * @param selector CSS selector for the target element
 * @param op Operation to execute when element is found
 */
export function registerPendingOp(selector: string, op: PendingOp) {
  const ops = pendingSelectors.get(selector) || [];
  ops.push(op);
  pendingSelectors.set(selector, ops);
}

/**
 * Check all pending selectors and execute queued operations for found elements.
 */
function checkPendingSelectors() {
  pendingCheckScheduled = false;
  if (pendingSelectors.size === 0) return;

  const entries = Array.from(pendingSelectors.entries());
  let i = 0;
  while (i < entries.length) {
    const [selector, ops] = entries[i++];
    const node = document.querySelector(selector);
    if (node) {
      let j = 0;
      while (j < ops.length) {
        ops[j++](node);
      }
      pendingSelectors.delete(selector);
    }
  }
}

/**
 * Schedule a check for pending selectors.
 * Debounced to batch multiple additions.
 */
function schedulePendingCheck() {
  if (!pendingCheckScheduled) {
    pendingCheckScheduled = true;
    setTimeout(checkPendingSelectors, 0);
  }
}

/**
 * Run all hooks of a given type for an element.
 * @param element The DOM element
 * @param type The hook type
 */
function runHooks(element: HellaElement, type: HookType) {
  const stacks = element[HOOKS_KEY];
  if (!stacks) return;

  const hooks = stacks[type];
  let i = 0;
  while (i < hooks.length) {
    hooks[i++]();
  }
}

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

  // Check pending selectors when nodes are added
  if (pendingSelectors.size > 0) {
    schedulePendingCheck();
  }
});

/**
 * Dispose effects and clear events for a node.
 * Safe to call multiple times.
 * @param node Node to clean
 */
function clean(node: Node) {
  const element = node as HellaElement;

  // Run beforeDestroy hooks
  runHooks(element, "beforeDestroy");

  // Dispose component scope if it exists
  element.__hella_component_scope?.();

  const effects = element[EFFECTS_KEY];
  effects?.forEach((fn: () => void) => fn());
  delete element[EFFECTS_KEY];

  delete element[HANDLERS_KEY];

  delete element.__hella_mounted;

  // Run destroy hooks
  runHooks(element, "destroy");
  delete element[HOOKS_KEY];
  delete element.__hella_component_scope;
}

/**
 * Mount a node and all its descendants recursively.
 * @param node Root node to mount
 */
function mountWithDescendants(node: Node) {
  const element = node as HellaElement;
  element.__hella_mounted = true;
  runHooks(element, "mount");

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
    const hookElement = parent || element;
    const isMounted = hookElement?.__hella_mounted;
    isMounted && runHooks(hookElement, "beforeUpdate");
    effectFn();
    isMounted && runHooks(hookElement, "update");
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

/**
 * Manually process pending selectors. For testing purposes only.
 * @internal
 */
export function flushPendingSelectors() {
  checkPendingSelectors();
}

/**
 * Get count of pending selectors. For testing purposes only.
 * @internal
 */
export function getPendingCount() {
  return pendingSelectors.size;
}

/**
 * Clear all pending selectors. For testing purposes only.
 * @internal
 */
export function clearPendingSelectors() {
  pendingSelectors.clear();
}