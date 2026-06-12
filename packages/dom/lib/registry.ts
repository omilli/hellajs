import { effect } from "./internal/core";
import { hasDocument } from "./internal/core";
import { cleanupSubtree, traverseDescendants, runHooks } from "./internal/cleanup";
import { getState, hasState } from "./internal/state";
import type { HookType } from "./types/nodes";

export const cleanupQueue = new Set<Node>();
export const mountQueue = new Set<Node>();

let isCleaning = false;
let isMounting = false;
let cleanupScheduled = false;
let mountScheduled = false;

const observedContainers = new WeakSet<Element>();
let containerObserver: MutationObserver | null = null;

export function scheduleCleanup() {
  if (!cleanupScheduled) {
    cleanupScheduled = true;
    queueMicrotask(processCleanupQueue);
  }
}

function ensureContainerObserver() {
  if (containerObserver || !hasDocument()) return;
  containerObserver = new MutationObserver((mutationsList) => {
    let hasRemovals = false;
    let hasAdditions = false;

    let i = 0;
    while (i < mutationsList.length) {
      const mutation = mutationsList[i++]!;
      const { removedNodes, addedNodes } = mutation;

      let j = 0;
      while (j < removedNodes.length) {
        const node = removedNodes[j++]!;
        if (hasState(node)) {
          cleanupQueue.add(node);
          hasRemovals = true;
        }
      }

      j = 0;
      while (j < addedNodes.length) {
        const addedNode = addedNodes[j++]!;
        if (addedNode.nodeType === Node.ELEMENT_NODE) {
          mountQueue.add(addedNode);
          hasAdditions = true;
        }
      }
    }

    if (hasRemovals) scheduleCleanup();

    if (hasAdditions && !mountScheduled) {
      mountScheduled = true;
      queueMicrotask(processMountQueue);
    }
  });
}

export function registerContainer(container: Element) {
  if (observedContainers.has(container)) return;
  observedContainers.add(container);
  ensureContainerObserver();
  containerObserver!.observe(container, { childList: true, subtree: true });
}

export function processCleanupQueue() {
  if (isCleaning) return;
  isCleaning = true;
  cleanupScheduled = false;

  const nodes = Array.from(cleanupQueue);
  let i = 0;
  const len = nodes.length;
  while (i < len) {
    const node = nodes[i++]!;
    if ((node as ChildNode).isConnected || (node as ChildNode).parentNode) continue;
    cleanupSubtree(node);
  }

  cleanupQueue.clear();

  isCleaning = false;
}

export function processMountQueue() {
  if (isMounting) return;
  isMounting = true;
  mountScheduled = false;

  const nodes = Array.from(mountQueue);
  let i = 0;
  const len = nodes.length;
  while (i < len) {
    const node = nodes[i++]!;
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
