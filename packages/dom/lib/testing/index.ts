/**
 * Testing utilities for @hellajs/dom.
 * Directly manipulates exported registry state.
 */
import {
  cleanupQueue,
  mountQueue,
  mutationCallbacks,
  cleanupScheduled,
  mountScheduled,
  isCleaning,
  isMounting,
  processCleanupQueue,
  processMountQueue
} from "../registry";

import { multiSelectors, checkMultiSelectors } from "../ref";

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

export function flushCleanup() {
  cleanupScheduled() && processCleanupQueue();
}

export function queueCleanup(node: Node) {
  cleanupQueue.add(node);
  processCleanupQueue();
}

export function reset() {
  cleanupQueue.clear();
  mountQueue.clear();
  mutationCallbacks.clear();
  cleanupScheduled(false);
  mountScheduled(false);
  isCleaning(false);
  isMounting(false);
  multiSelectors.clear();
}

export { checkMultiSelectors, multiSelectors };
