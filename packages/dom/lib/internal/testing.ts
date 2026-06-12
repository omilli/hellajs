import {
  cleanupQueue,
  mountQueue,
  processCleanupQueue,
  processMountQueue
} from "./queue";

import { multiSelectors, checkMultiSelectors } from "./selectors";

/**
 * @internal
 * Flushes the mount queue for all children of the given root node.
 * @param root The root node to flush mounts for
 */
export function flushMount(root: Node = document.body) {
  if (root.hasChildNodes()) {
    const children = root.childNodes;
    let i = 0;
    while (i < children.length)
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

export { checkMultiSelectors, multiSelectors };
