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
const LOAD_CALLBACKS_KEY = "__hella_load" as const;
const QUEUED_OPS_KEY = "__hella_queue" as const;

/**
 * Pending load callbacks for selectors that don't exist yet.
 */
const pendingCallbacks = new Map<string, Array<() => void>>();

/**
 * Cleanup coordination flags and queue.
 */
let isCleaning = false;
let cleanupScheduled = false;
const cleanupQueue = new Set<Node>();

/**
 * Load coordination flags and queue.
 */
let isLoading = false;
let loadScheduled = false;
const loadQueue = new Set<Node>();

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
 * Process all queued nodes for load callbacks.
 * Executes load handlers and queued operations when elements enter DOM.
 */
function processLoadQueue() {
  if (isLoading) return;
  isLoading = true;
  loadScheduled = false;

  const nodes = Array.from(loadQueue);
  loadQueue.clear();

  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i++];
    if (!(node as ChildNode).isConnected) continue;
    executeLoadCallbacks(node);
    executeQueuedOperations(node);
  }

  isLoading = false;
}

/**
 * Execute all onLoad callbacks for a node.
 * @param node Node that entered the DOM
 */
function executeLoadCallbacks(node: Node) {
  const element = node as HellaElement;
  const callbacks = element[LOAD_CALLBACKS_KEY];
  if (!callbacks) return;

  let i = 0;
  while (i < callbacks.length) {
    callbacks[i++]();
  }
}

/**
 * Execute all queued operations for a node.
 * @param node Node that entered the DOM
 */
function executeQueuedOperations(node: Node) {
  const element = node as HellaElement;
  const queue = element[QUEUED_OPS_KEY];
  if (!queue) return;

  let i = 0;
  while (i < queue.length) {
    queue[i++]();
  }
}

/**
 * Add descendants with load callbacks or queued operations to the load queue.
 * @param node Root node to process
 */
function addDescendantsToLoadQueue(node: Node) {
  if (node.nodeType === 1 && node.hasChildNodes()) {
    const children = node.childNodes;
    let i = 0;
    while (i < children.length) {
      const child = children[i++];
      const element = child as HellaElement;
      if (element[LOAD_CALLBACKS_KEY] || element[QUEUED_OPS_KEY]) {
        loadQueue.add(child);
      }
      if (child.hasChildNodes()) {
        addDescendantsToLoadQueue(child);
      }
    }
  }
}

/**
 * Check pending callbacks for newly added nodes and their descendants.
 * @param node Node that was added to DOM
 */
function checkPendingCallbacks(node: Node) {
  if (node.nodeType !== 1) return;
  if (pendingCallbacks.size === 0) return;

  const matchedSelectors: string[] = [];

  pendingCallbacks.forEach((callbacks, selector) => {
    try {
      // Check the node itself
      if ((node as Element).matches(selector)) {
        const element = node as HellaElement;
        element[LOAD_CALLBACKS_KEY] = element[LOAD_CALLBACKS_KEY] || [];

        let i = 0;
        while (i < callbacks.length) {
          element[LOAD_CALLBACKS_KEY].push(callbacks[i++]);
        }

        matchedSelectors.push(selector);
      } else {
        // Check descendants
        const matches = (node as Element).querySelectorAll(selector);
        if (matches.length > 0) {
          let j = 0;
          while (j < matches.length) {
            const match = matches[j++] as HellaElement;
            match[LOAD_CALLBACKS_KEY] = match[LOAD_CALLBACKS_KEY] || [];

            let k = 0;
            while (k < callbacks.length) {
              match[LOAD_CALLBACKS_KEY].push(callbacks[k++]);
            }
          }

          matchedSelectors.push(selector);
        }
      }
    } catch (e) {
      // Invalid selector, ignore
    }
  });

  // Remove matched selectors from pending
  let i = 0;
  while (i < matchedSelectors.length) {
    pendingCallbacks.delete(matchedSelectors[i++]);
  }
}

/**
 * Single global MutationObserver that detects node removals and queues them for cleanup.
 * Defers actual cleanup to avoid blocking the main thread during mass node removal.
 */
const observer = new MutationObserver((mutationsList) => {
  let i = 0;
  while (i < mutationsList.length) {
    const { addedNodes, removedNodes } = mutationsList[i++];

    // Process removed nodes
    let j = 0;
    while (j < removedNodes.length) {
      cleanupQueue.add(removedNodes[j++]);
    }

    // Process added nodes
    let k = 0;
    while (k < addedNodes.length) {
      const node = addedNodes[k++];
      if (node.nodeType === 1) {
        checkPendingCallbacks(node);
        loadQueue.add(node);
        addDescendantsToLoadQueue(node);
      }
    }
  }

  if (!cleanupScheduled) {
    cleanupScheduled = true;
    setTimeout(processCleanupQueue, 0);
  }

  if (!loadScheduled && loadQueue.size > 0) {
    loadScheduled = true;
    setTimeout(processLoadQueue, 0);
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

  // Clear queued operations (they should not persist across removal/re-add cycles)
  if (element[QUEUED_OPS_KEY]) {
    delete element[QUEUED_OPS_KEY];
  }

  // Keep load callbacks for potential re-add
  // Load callbacks are persistent across removal/re-add

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

/**
 * Register a load callback for a node.
 * The callback fires every time the element enters the DOM.
 * @param node Host DOM node
 * @param callback Callback to execute when element loads
 */
export function addLoadCallback(node: Node, callback: () => void) {
  if (typeof callback !== "function") return;

  const element = node as HellaElement;
  element[LOAD_CALLBACKS_KEY] = element[LOAD_CALLBACKS_KEY] || [];
  element[LOAD_CALLBACKS_KEY].push(callback);

  // If element is already in DOM, execute immediately
  if ((node as ChildNode).isConnected) {
    callback();
  }
}

/**
 * Register a pending load callback for a selector that doesn't exist yet.
 * @param selector CSS selector for element that will be added later
 * @param callback Callback to execute when element is added
 */
export function addPendingLoadCallback(selector: string, callback: () => void) {
  if (typeof callback !== "function" || !selector) return;

  const callbacks = pendingCallbacks.get(selector) || [];
  callbacks.push(callback);
  pendingCallbacks.set(selector, callbacks);
}

/**
 * Queue an operation to execute when element enters the DOM.
 * @param node Host DOM node
 * @param operation Operation to queue
 */
export function queueOperation(node: Node, operation: () => void) {
  if (typeof operation !== "function") return;

  const element = node as HellaElement;
  element[QUEUED_OPS_KEY] = element[QUEUED_OPS_KEY] || [];
  element[QUEUED_OPS_KEY].push(operation);
}

/**
 * Check if a node is currently in the DOM.
 * @param node Node to check
 * @returns True if node is connected to DOM
 */
export function isNodeConnected(node: Node | null): boolean {
  return node ? (node as ChildNode).isConnected : false;
}