/**
 * Testing utilities for @hellajs/dom.
 * Directly manipulates exported registry state.
 */
import {
  cleanupQueue,
  mountQueue,
  mutationCallbacks,
  cleanupScheduled,
  processCleanupQueue,
  processMountQueue
} from "../registry";

import { multiSelectors, checkMultiSelectors } from "../collection";

export function triggerMutationCallbacks() {
  for (const callback of mutationCallbacks)
    callback();
}

export function flushMount(root: Node = document.body) {
  if (root.hasChildNodes()) {
    const children = root.childNodes;
    let i = 0;
    while (i < children.length) {
      mountQueue.add(children[i++]);
    }
  }
  processMountQueue();
}

export function queueCleanup(node: Node) {
  cleanupQueue.add(node);
  processCleanupQueue();
}

export { checkMultiSelectors, multiSelectors };
