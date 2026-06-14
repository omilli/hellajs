import { hasDocument } from "./core";
import { hasState } from "./state";
import { cleanupQueue, scheduleCleanup } from "./queue";
import type { MultiOp, SelectorEntry } from "../types/nodes";

/**
 * @internal
 * Global registry of CSS selectors to their operation callbacks and processed nodes.
 */
export const multiSelectors = new Map<string, SelectorEntry>();

let refObserver: MutationObserver | null = null;
let isMultiCheckScheduled = false;

/**
 * @internal
 * Schedules a multi-selector check via microtask.
 */
function scheduleMultiCheck() {
  if (!isMultiCheckScheduled) {
    isMultiCheckScheduled = true;
    queueMicrotask(checkMultiSelectors);
  }
}

/**
 * @internal
 * Creates and starts the MutationObserver for selector watching on document.body.
 * Disconnects automatically when no selectors remain.
 */
export function ensureRefObserver() {
  if (refObserver || !hasDocument()) return;
  refObserver = new MutationObserver((mutationsList) => {
    let hasRemovals = false;
    let i = 0;
    const mLen = mutationsList.length;
    while (i < mLen) {
      const { removedNodes } = mutationsList[i++]!;
      let j = 0;
      const rLen = removedNodes.length;
      while (j < rLen) {
        const node = removedNodes[j++]!;
        if (node.nodeType === Node.ELEMENT_NODE && hasState(node)) {
          cleanupQueue.add(node);
          hasRemovals = true;
        }
      }
    }
    if (hasRemovals) scheduleCleanup();
    scheduleMultiCheck();
  });
  refObserver.observe(document.body, { childList: true, subtree: true });
}

/**
 * @internal
 * Disconnects the refObserver when no selectors remain.
 */
function cleanupRefObserver() {
  if (multiSelectors.size === 0 && refObserver) {
    refObserver.disconnect();
    refObserver = null;
  }
}

/**
 * @internal
 * Checks all registered selectors for newly added elements and applies queued operations.
 * Called after MutationObserver detects DOM additions.
 */
export function checkMultiSelectors() {
  isMultiCheckScheduled = false;
  if (multiSelectors.size === 0) return;

  const selectorKeys = Array.from(multiSelectors.keys());
  let si = 0;
  const sLen = selectorKeys.length;
  while (si < sLen) {
    const selector = selectorKeys[si++]!;
    const { ops, processedNodes } = multiSelectors.get(selector)!;
    const nodes = document.querySelectorAll(selector);
    const newNodes: Element[] = [];

    let i = 0;
    const nLen = nodes.length;
    while (i < nLen) {
      const node = nodes[i++]!;
      if (!processedNodes.has(node)) {
        processedNodes.add(node);
        newNodes.push(node);
      }
    }

    if (newNodes.length > 0) {
      let j = 0;
      const oLen = ops.length;
      while (j < oLen) {
        ops[j++]!(newNodes);
      }
    }
  }
}

/**
 * @internal
 * Registers a selector operation callback for auto-watching.
 * @param selector CSS selector string
 * @param op Callback function receiving new elements
 * @param initialNodes Optional initial nodes to mark as processed
 */
export function registerMultiOp(selector: string, op: MultiOp, initialNodes?: Element[]) {
  const entry = multiSelectors.get(selector) || {
    ops: [],
    processedNodes: new WeakSet()
  };
  entry.ops.push(op);

  if (initialNodes) {
    let i = 0;
    const len = initialNodes.length;
    while (i < len) {
      entry.processedNodes.add(initialNodes[i++]!);
    }
  }

  multiSelectors.set(selector, entry);
  ensureRefObserver();
}

/**
 * @internal
 * Removes a selector operation callback and cleans up observer if empty.
 * @param selector CSS selector string
 * @param op The operation callback to remove
 */
export function unregisterMultiOp(selector: string, op: MultiOp) {
  const entry = multiSelectors.get(selector);
  if (!entry) return;

  const index = entry.ops.indexOf(op);
  if (index !== -1) {
    entry.ops.splice(index, 1);
  }

  if (entry.ops.length === 0) {
    multiSelectors.delete(selector);
  }

  cleanupRefObserver();
}

/**
 * @internal
 * Resets all selector state — clears selector registry, disconnects observer, resets scheduling flag.
 */
export function resetSelectorState() {
  multiSelectors.clear();
  if (refObserver) {
    refObserver.disconnect();
    refObserver = null;
  }
  isMultiCheckScheduled = false;
}
