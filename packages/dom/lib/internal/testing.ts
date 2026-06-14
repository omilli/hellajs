import {
  cleanupQueue,
  mountQueue,
  processCleanupQueue,
  processMountQueue,
  resetQueueState
} from "./queue";
import { handlerCounts } from "./counts";
import { resetEventState } from "./events";
import { resetSelectorState } from "./selectors";

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

/**
 * @internal
 * Resets all DOM package mutable state — queues, scheduling flags, observers, selector registry, event listeners, handler counts.
 */
export function resetDomState() {
  resetQueueState();
  resetEventState();
  resetSelectorState();
  handlerCounts.clear();
}