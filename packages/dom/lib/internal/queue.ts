import { hasDocument } from "./core";
import { cleanupSubtree, traverseDescendants, runHooks } from "./cleanup";
import { getState, hasState } from "./state";

/**
 * @internal
 * Queue of nodes pending cleanup processing.
 */
export const cleanupQueue = new Set<Node>();

/**
 * @internal
 * Queue of nodes pending mount processing.
 */
export const mountQueue = new Set<Node>();

let isCleaning = false;
let isMounting = false;
let isCleanupScheduled = false;
let isMountScheduled = false;

const observedContainers = new WeakSet<Element>();
let containerObserver: MutationObserver | null = null;

/**
 * @internal
 * Schedules cleanup queue processing via microtask.
 */
export function scheduleCleanup() {
  if (!isCleanupScheduled) {
    isCleanupScheduled = true;
    queueMicrotask(processCleanupQueue);
  }
}

/**
 * @internal
 * Creates the scoped MutationObserver on mount targets for cleanup/mount tracking.
 */
function ensureContainerObserver() {
  if (containerObserver || !hasDocument()) return;
  containerObserver = new MutationObserver((mutationsList) => {
    let hasRemovals = false;
    let hasAdditions = false;

    let i = 0;
    const mLen = mutationsList.length;
    while (i < mLen) {
      const mutation = mutationsList[i++]!;
      const { removedNodes, addedNodes } = mutation;

      let j = 0;
      const rLen = removedNodes.length;
      while (j < rLen) {
        const node = removedNodes[j++]!;
        if (hasState(node)) {
          cleanupQueue.add(node);
          hasRemovals = true;
        }
      }

      j = 0;
      const aLen = addedNodes.length;
      while (j < aLen) {
        const addedNode = addedNodes[j++]!;
        if (addedNode.nodeType === Node.ELEMENT_NODE) {
          mountQueue.add(addedNode);
          hasAdditions = true;
        }
      }
    }

    if (hasRemovals) scheduleCleanup();

    if (hasAdditions && !isMountScheduled) {
      isMountScheduled = true;
      queueMicrotask(processMountQueue);
    }
  });
}

/**
 * @internal
 * Registers an element for MutationObserver-based cleanup/mount tracking.
 * @param container The container element to observe
 */
export function registerContainer(container: Element) {
  if (observedContainers.has(container)) return;
  observedContainers.add(container);
  ensureContainerObserver();
  containerObserver!.observe(container, { childList: true, subtree: true });
}

/**
 * @internal
 * Processes all pending cleanup operations.
 */
export function processCleanupQueue() {
  if (isCleaning) return;
  isCleaning = true;
  isCleanupScheduled = false;

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

/**
 * @internal
 * Processes all pending mount operations.
 */
export function processMountQueue() {
  if (isMounting) return;
  isMounting = true;
  isMountScheduled = false;

  const nodes = Array.from(mountQueue);
  let i = 0;
  const len = nodes.length;
  while (i < len) {
    const node = nodes[i++]!;
    if (!(node as ChildNode).isConnected) continue;
    traverseDescendants(node, (n) => {
      if (n.nodeType !== Node.ELEMENT_NODE) return;
      if (!hasState(n)) return;
      getState(n).isMounted = true;
      runHooks(n, "afterMount");
    });
  }
  mountQueue.clear();

  isMounting = false;
}

/**
 * @internal
 * Resets all queue state — clears queues, resets scheduling flags, disconnects container observer.
 */
export function resetQueueState() {
  cleanupQueue.clear();
  mountQueue.clear();
  isCleaning = false;
  isMounting = false;
  isCleanupScheduled = false;
  isMountScheduled = false;
  if (containerObserver) {
    containerObserver.disconnect();
    containerObserver = null;
  }
}

/**
 * @internal
 * Flushes the mount queue for all children of the given root node.
 * @param root The root node to flush mounts for
 */
export function flushMount(root: Node = document.body) {
  if (root.hasChildNodes()) {
    const children = root.childNodes;
    let i = 0;
    const len = children.length;
    while (i < len)
      mountQueue.add(children[i++]!);
  }
  processMountQueue();
}

/**
 * @internal
 * Queues a node for cleanup and processes the queue immediately.
 * @param node The node to clean up
 */
export function queueCleanup(node: Node) {
  cleanupQueue.add(node);
  processCleanupQueue();
}
