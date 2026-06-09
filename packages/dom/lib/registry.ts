import { effect, signal } from "./internal/core";
import { handlerCounts } from "./internal/counts";
import { removeDirectHandlers } from "./internal/direct-events";
import type { HellaElement, HookStacks, HookType } from "./types/nodes";

// Internal property keys for element storage
const EFFECTS_KEY = "__hella_effects";
const HANDLERS_KEY = "__hella_handlers";
const HOOKS_KEY = "__hella_hooks";

// Queues for deferred processing
export const cleanupQueue = new Set<Node>();
export const mountQueue = new Set<Node>();
export const mutationCallbacks = new Set<() => void>();

// State signals to prevent re-entrant processing
export const isCleaning = signal(false);
export const isMounting = signal(false);
export const cleanupScheduled = signal(false);
export const mountScheduled = signal(false);

/**
 * Gets or creates hook stacks for an element.
 * @param element Target element
 * @returns Hook stacks object with arrays for each hook type
 */
function getHookStacks(element: HellaElement): HookStacks {
  if (!element[HOOKS_KEY]) {
    element[HOOKS_KEY] = {
      beforeMount: [],
      afterMount: [],
      beforeDestroy: [],
      afterDestroy: [],
      beforeUpdate: [],
      afterUpdate: [],
    };
  }
  return element[HOOKS_KEY]!;
}

/**
 * Executes all hooks of a given type on an element.
 * beforeMount and afterDestroy don't receive element argument.
 * @param element Target element
 * @param type Hook type to execute
 */
function runHooks(element: HellaElement, type: HookType) {
  const stacks = element[HOOKS_KEY];
  if (!stacks) return;

  const hooks = stacks[type];
  const len = hooks.length;
  if (len === 0) return;

  // beforeMount and afterDestroy hooks don't receive element parameter
  const passNode = type !== "beforeMount" && type !== "afterDestroy";
  let i = 0;
  while (i < len) {
    passNode ? (hooks[i++] as (node: Element) => void)(element) : (hooks[i++] as () => void)();
  }
}

/**
 * Cleans up all HellaJS resources on a node.
 * Runs hooks, disposes effects, removes handlers, clears internal state.
 * @param node Node to clean up
 */
function clean(node: Node) {
  const element = node as HellaElement;

  runHooks(element, "beforeDestroy");

  // Dispose component scope and portal cleanup
  element.__hella_component_scope?.();
  element.__hella_portal_cleanup?.();

  // Dispose all reactive effects
  element[EFFECTS_KEY]?.forEach(fn => fn());
  delete element[EFFECTS_KEY];

  // Remove direct (non-delegated) event handlers
  removeDirectHandlers(element);

  // Remove delegated handlers and decrement counts
  const handlers = element[HANDLERS_KEY];
  if (handlers) {
    for (const type in handlers) {
      const count = handlerCounts.get(type);
      count !== undefined &&
        count > 1 ? handlerCounts.set(type, count - 1) : handlerCounts.delete(type);
    }
    delete element[HANDLERS_KEY];
  }

  delete element.__hella_mounted;

  runHooks(element, "afterDestroy");
  delete element[HOOKS_KEY];
  delete element.__hella_component_scope;
  delete element.__hella_portal_cleanup;
}

/**
 * Traverses all descendants of a node using iterative stack-based traversal.
 * More efficient than recursion for deep DOM trees.
 * @param node Root node to traverse from
 * @param callback Function to call for each descendant
 */
function traverseDescendants(node: Node, callback: (node: Node) => void) {
  const stack: Node[] = [node];
  let current: Node | undefined;

  while ((current = stack.pop())) {
    callback(current);

    // Only elements (nodeType 1) can have children
    if (current.nodeType === 1 && current.hasChildNodes()) {
      const children = current.childNodes;
      let i = children.length;
      while (i--) stack.push(children[i]!);
    }
  }
}

/**
 * Processes all queued cleanup operations.
 * Skips nodes that are still connected or have parent (moved, not removed).
 * Guards against re-entrant processing via isCleaning signal.
 */
export function processCleanupQueue() {
  if (isCleaning()) return;
  isCleaning(true);
  cleanupScheduled(false);

  for (const node of cleanupQueue) {
    // Skip if node was moved (still has connection) rather than removed
    if ((node as ChildNode).isConnected || (node as ChildNode).parentNode) continue;
    traverseDescendants(node, clean);
  }

  cleanupQueue.clear();

  isCleaning(false);
}

/**
 * Processes all queued mount operations.
 * Sets __hella_mounted flag and runs afterMount hooks.
 * Skips nodes disconnected before processing.
 */
export function processMountQueue() {
  if (isMounting()) return;
  isMounting(true);
  mountScheduled(false);

  for (const node of mountQueue) {
    // Skip if node was removed before processing
    if (!(node as ChildNode).isConnected) continue;
    traverseDescendants(node, (n) => {
      const element = n as HellaElement;
      element.__hella_mounted = true;
      runHooks(element, "afterMount");
    });
  }
  mountQueue.clear();

  isMounting(false);
}

// Global MutationObserver for automatic lifecycle management
// Watches all DOM mutations and queues cleanup/mount operations
if (typeof MutationObserver !== "undefined") {
  const observer = new MutationObserver((mutationsList) => {
    let hasRemovals = false;
    let hasAdditions = false;

    // Batch process all mutations
    let i = 0;
    while (i < mutationsList.length) {
      const mutation = mutationsList[i++]!;
      const { removedNodes, addedNodes } = mutation;

      // Queue removed nodes for cleanup
      let j = 0;
      while (j < removedNodes.length) {
        cleanupQueue.add(removedNodes[j++]!);
        hasRemovals = true;
      }

      // Queue added nodes for mount processing
      j = 0;
      while (j < addedNodes.length) {
        mountQueue.add(addedNodes[j++]!);
        hasAdditions = true;
      }
    }

    // Schedule deferred cleanup (non-blocking)
    if (hasRemovals && !cleanupScheduled()) {
      cleanupScheduled(true);
      setTimeout(processCleanupQueue, 0);
    }

    // Schedule deferred mount processing and notify callbacks
    if (hasAdditions) {
      if (!mountScheduled()) {
        mountScheduled(true);
        setTimeout(processMountQueue, 0);
      }

      // Notify mutation callbacks (used by $ref, $collection)
      for (const callback of mutationCallbacks) {
        callback();
      }
    }
  });

  observer.observe(document, {
    childList: true,
    subtree: true
  });
}

/**
 * Registry API for managing element effects, events, and hooks.
 * All operations store data directly on elements for automatic cleanup.
 */
export const registry = {
  /**
   * Registers a reactive effect on an element with update hooks.
   * Effect is automatically disposed when element is removed from DOM.
   * @param element Target element
   * @param effectFn Effect function to run
   */
  addEffect(element: HellaElement, effectFn: () => void) {
    const dispose = effect(() => {
      element.__hella_mounted && runHooks(element, "beforeUpdate");
      effectFn();
      element.__hella_mounted && runHooks(element, "afterUpdate");
    });

    // Store dispose function for cleanup
    !element[EFFECTS_KEY]
      ? element[EFFECTS_KEY] = [dispose]
      : element[EFFECTS_KEY].push(dispose);
  },

  /**
   * Registers a delegated event handler on an element.
   * Handler count is tracked for fast-exit optimization in event delegation.
   * @param element Target element
   * @param type Event type (e.g., 'click', 'input')
   * @param handler Event handler function
   */
  addEvent(element: HellaElement, type: string, handler: EventListener) {
    element[HANDLERS_KEY] = element[HANDLERS_KEY] || {};
    element[HANDLERS_KEY][type] = handler;
  },

  /**
   * Registers a lifecycle hook on an element.
   * Multiple hooks of the same type stack and all execute.
   * @param element Target element
   * @param type Hook type (beforeMount, afterMount, etc.)
   * @param fn Hook function (with or without element parameter)
   */
  addHook(
    element: HellaElement,
    type: HookType,
    fn: (() => void) | ((node: Element) => void)
  ) {
    const stacks = getHookStacks(element);
    (stacks[type] as Array<typeof fn>).push(fn);
  }
};
