/**
 * DOM node cleanup system for reactive effects and delegated events.
 * Stores effects and event handlers directly on DOM elements and automatically
 * disposes them when nodes are detached from the document.
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
 * Multi-element pending operations that persist across DOM mutations.
 * Unlike single-element pendingSelectors, these don't delete after first match.
 * Maps CSS selectors to operations and a WeakSet tracking processed nodes.
 */
type MultiPendingOp = (nodes: Element[]) => void;
const multiPendingSelectors = new Map<string, {
  ops: MultiPendingOp[];
  processedNodes: WeakSet<Element>;
}>();
let multiPendingCheckScheduled = false;

/**
 * Gets or creates the hook stacks for an element.
 * @param element The DOM element
 * @returns The hook stacks object
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
 * Adds a hook to an element's stack.
 * @param element The DOM element
 * @param type The hook type (mount, destroy, etc.)
 * @param fn The callback function to execute
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
 * Registers an operation to execute on all matching elements, now and in the future.
 * Operations persist and apply to new elements as they're added to the DOM.
 * @param selector CSS selector for target elements
 * @param op Operation to execute when elements are found
 * @param initialNodes Optional array of nodes already processed (to prevent duplicates)
 * @returns Unique operation ID for later unregistration
 */
export function registerMultiPendingOp(selector: string, op: MultiPendingOp, initialNodes?: Element[]): symbol {
  const entry = multiPendingSelectors.get(selector) || {
    ops: [],
    processedNodes: new WeakSet()
  };
  entry.ops.push(op);

  // Mark initial nodes as already processed to prevent duplicate applications
  if (initialNodes) {
    let i = 0;
    while (i < initialNodes.length) {
      entry.processedNodes.add(initialNodes[i++]);
    }
  }

  multiPendingSelectors.set(selector, entry);

  // Return unique ID for this specific operation
  return Symbol();
}

/**
 * Unregisters a specific operation for a selector.
 * @param selector CSS selector
 * @param op Operation to remove
 */
export function unregisterMultiPendingOp(selector: string, op: MultiPendingOp) {
  const entry = multiPendingSelectors.get(selector);
  if (!entry) return;

  const index = entry.ops.indexOf(op);
  if (index !== -1) {
    entry.ops.splice(index, 1);
  }

  // Clean up empty entries
  if (entry.ops.length === 0) {
    multiPendingSelectors.delete(selector);
  }
}

/**
 * Checks multi-element pending selectors and executes operations on new elements only.
 * Uses WeakSet to track which nodes have already been processed.
 */
function checkMultiPendingSelectors() {
  multiPendingCheckScheduled = false;
  if (multiPendingSelectors.size === 0) return;

  const entries = Array.from(multiPendingSelectors.entries());
  let i = 0;
  while (i < entries.length) {
    const [selector, { ops, processedNodes }] = entries[i++];
    const nodes = document.querySelectorAll(selector);
    const newNodes: Element[] = [];

    let j = 0;
    while (j < nodes.length) {
      const node = nodes[j++];
      if (!processedNodes.has(node)) {
        processedNodes.add(node);
        newNodes.push(node);
      }
    }

    if (newNodes.length > 0) {
      let k = 0;
      while (k < ops.length) {
        ops[k++](newNodes);
      }
    }
  }
}

/**
 * Schedules a check for multi-element pending selectors with debouncing.
 */
function scheduleMultiPendingCheck() {
  if (!multiPendingCheckScheduled) {
    multiPendingCheckScheduled = true;
    setTimeout(checkMultiPendingSelectors, 0);
  }
}

/**
 * Runs all hooks of a given type for an element.
 * @param element The DOM element
 * @param type The hook type to run
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
 * Processes all queued nodes for cleanup in a non-blocking deferred manner.
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
 * Processes all queued nodes for mounting asynchronously after nodes are in the DOM.
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
 * Global MutationObserver that detects node removals/additions and queues them for processing.
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

  // Check multi-element pending selectors when nodes are added
  if (multiPendingSelectors.size > 0) {
    scheduleMultiPendingCheck();
  }
});

/**
 * Disposes effects and clears events for a node. Safe to call multiple times.
 * @param node The node to clean
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
 * Mounts a node and all its descendants recursively.
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
 * Cleans a node and all its descendants recursively.
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
 * Registers a reactive effect for a node with automatic cleanup.
 * The effect disposer is stored and invoked during cleanup.
 * @param element Host DOM element
 * @param effectFn Effect function to execute reactively
 * @param parent Optional parent element for hook execution
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
 * Registers an event handler for a node.
 * Used by the global event delegation system for lookup and cleanup.
 * @param element Host DOM element
 * @param type Event type (e.g., "click")
 * @param handler Event listener function
 */
export function addRegistryEvent(element: HellaElement, type: string, handler: EventListener) {
  element[HANDLERS_KEY] = element[HANDLERS_KEY] || {};
  element[HANDLERS_KEY][type] = handler;
}
/**
 * Manually queues and processes mounts. For testing purposes only.
 * @param root Root node to mount from (defaults to document.body)
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
 * Manually processes cleanup queue. For testing purposes only.
 */
export function flushCleanupQueue() {
  if (cleanupScheduled) {
    processCleanupQueue();
  }
}

/**
 * Manually queues a node for cleanup and processes it. For testing purposes only.
 * @param node The node to queue for cleanup
 */
export function queueCleanup(node: Node) {
  cleanupQueue.add(node);
  processCleanupQueue();
}

/**
 * Manually processes multi-element pending selectors. For testing purposes only.
 */
export function flushMultiPendingSelectors() {
  checkMultiPendingSelectors();
}

/**
 * Gets count of multi-element pending selectors. For testing purposes only.
 * @returns The number of multi-element pending selectors
 */
export function getMultiPendingCount() {
  return multiPendingSelectors.size;
}

/**
 * Clears all multi-element pending selectors. For testing purposes only.
 */
export function clearMultiPendingSelectors() {
  multiPendingSelectors.clear();
}