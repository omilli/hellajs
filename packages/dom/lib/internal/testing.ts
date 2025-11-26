import { cleanupQueue, cleanupScheduled, mountQueue, processCleanupQueue, processMountQueue } from "./registry";

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