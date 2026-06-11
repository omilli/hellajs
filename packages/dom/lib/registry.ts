import { effect } from "./internal/core";
import { hasDocument } from "./internal/core";
import { handlerCounts } from "./internal/counts";
import { removeDirectHandlers } from "./internal/direct-events";
import { getState, hasState, deleteState, peekState } from "./internal/element-map";
import type { HookType } from "./types/nodes";

export const cleanupQueue = new Set<Node>();
export const mountQueue = new Set<Node>();
export const mutationCallbacks = new Set<() => void>();

let isCleaning = false;
let isMounting = false;
let cleanupScheduled = false;
let mountScheduled = false;

/**
 * Executes all hooks of a given type on an element.
 * beforeMount and afterDestroy don't receive element argument.
 * @param element Target element
 * @param type Hook type to execute
 */
function runHooks(node: Node, type: HookType) {
  const hooks = peekState(node)?.hooks[type];
  if (!hooks) return;
  const len = hooks.length;
  if (len === 0) return;

  const passNode = type !== "beforeMount" && type !== "afterDestroy";
  const el = node as Element;
  let i = 0;
  while (i < len) {
    passNode ? (hooks[i++] as (node: Element) => void)(el) : (hooks[i++] as () => void)();
  }
}

/**
 * Cleans up all HellaJS resources on a node.
 * Runs hooks, disposes effects, removes handlers, clears internal state.
 * @param node Node to clean up
 */
function clean(node: Node) {
  if (!hasState(node)) return;

  runHooks(node, "beforeDestroy");

  const state = getState(node);

  state.componentScope?.();
  state.portalCleanup?.();

  let i = 0;
  const len = state.effects.length;
  while (i < len) {
    state.effects[i++]!();
  }
  state.effects.length = 0;

  removeDirectHandlers(node);

  const handlerKeys = Object.keys(state.handlers);
  i = 0;
  const hLen = handlerKeys.length;
  while (i < hLen) {
    const type = handlerKeys[i++]!;
    const count = handlerCounts.get(type);
    count !== undefined &&
      count > 1 ? handlerCounts.set(type, count - 1) : handlerCounts.delete(type);
  }

  runHooks(node, "afterDestroy");

  deleteState(node);
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
  if (isCleaning) return;
  isCleaning = true;
  cleanupScheduled = false;

  for (const node of cleanupQueue) {
    if ((node as ChildNode).isConnected || (node as ChildNode).parentNode) continue;
    traverseDescendants(node, clean);
  }

  cleanupQueue.clear();

  isCleaning = false;
}

/**
 * Processes all queued mount operations.
 * Sets mounted flag and runs afterMount hooks.
 * Skips nodes disconnected before processing.
 */
export function processMountQueue() {
  if (isMounting) return;
  isMounting = true;
  mountScheduled = false;

  for (const node of mountQueue) {
    if (!(node as ChildNode).isConnected) continue;
    traverseDescendants(node, (n) => {
      if (n.nodeType !== Node.ELEMENT_NODE) return;
      if (!hasState(n)) return;
      getState(n).mounted = true;
      runHooks(n, "afterMount");
    });
  }
  mountQueue.clear();

  isMounting = false;
}

if (hasDocument()) {
  const observer = new MutationObserver((mutationsList) => {
    let hasRemovals = false;
    let hasAdditions = false;

    let i = 0;
    while (i < mutationsList.length) {
      const mutation = mutationsList[i++]!;
      const { removedNodes, addedNodes } = mutation;

      let j = 0;
      while (j < removedNodes.length) {
        cleanupQueue.add(removedNodes[j++]!);
        hasRemovals = true;
      }

      j = 0;
      while (j < addedNodes.length) {
        mountQueue.add(addedNodes[j++]!);
        hasAdditions = true;
      }
    }

    if (hasRemovals && !cleanupScheduled) {
      cleanupScheduled = true;
      setTimeout(processCleanupQueue, 0);
    }

    if (hasAdditions) {
      if (!mountScheduled) {
        mountScheduled = true;
        setTimeout(processMountQueue, 0);
      }

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
 * All operations store data in a WeakMap for automatic cleanup.
 */
export const registry = {
  /**
   * Registers a reactive effect on an element with update hooks.
   * Accumulative: multiple calls stack effects on the same element.
   * Effect is automatically disposed when element is removed from DOM.
   * @param element Target element
   * @param effectFn Effect function to run
   */
  addEffect(node: Node, effectFn: () => void) {
    const state = getState(node);
    const dispose = effect(() => {
      state.mounted && runHooks(node, "beforeUpdate");
      effectFn();
      state.mounted && runHooks(node, "afterUpdate");
    });

    state.effects.push(dispose);
  },

  /**
   * Registers a delegated event handler on an element.
   * Replacement: calling again with the same type overwrites the previous handler.
   * Handler count is tracked for fast-exit optimization in event delegation.
   * @param element Target element
   * @param type Event type (e.g., 'click', 'input')
   * @param handler Event handler function
   */
  addEvent(element: Element, type: string, handler: EventListener) {
    getState(element).handlers[type] = handler;
  },

  /**
   * Registers a lifecycle hook on an element.
   * Accumulative: multiple calls stack hooks of the same type and all execute.
   * @param element Target element
   * @param type Hook type (beforeMount, afterMount, etc.)
   * @param handler Hook function (with or without element parameter)
   */
  addHook(
    element: Element,
    type: HookType,
    handler: (() => void) | ((node: Element) => void)
  ) {
    const stacks = getState(element).hooks;
    (stacks[type] || (stacks[type] = [])).push(handler);
  }
};
