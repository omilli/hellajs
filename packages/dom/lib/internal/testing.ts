import {
  cleanupQueue,
  mountQueue,
  processCleanupQueue,
  processMountQueue
} from "../registry";

import { multiSelectors, checkMultiSelectors } from "../$collection";

export function triggerMutationCallbacks() {
  checkMultiSelectors();
}

export function flushMount(root: Node = document.body) {
  if (root.hasChildNodes()) {
    const children = root.childNodes;
    let i = 0;
    while (i < children.length)
      mountQueue.add(children[i++]!);
  }
  processMountQueue();
}

export function queueCleanup(node: Node) {
  cleanupQueue.add(node);
  processCleanupQueue();
}

export { checkMultiSelectors, multiSelectors };
