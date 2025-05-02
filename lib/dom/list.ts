import { effect } from "../reactive";
import type { VNode } from "../types";

export interface ListItem {
  node: Node;
  effectCleanup?: () => void;
}

export const listMap = new WeakMap<() => unknown, {
  keyToItem: Map<string, ListItem>,
  lastKeys: string[]
}>();

export function bindList(child: VNode, node: Node): (() => void) | undefined {
  const childNodes = child.children || [];
  const cleanups: (() => void)[] = [];
  for (let i = 0, len = childNodes.length; i < len; i++) {
    const childNode = childNodes[i];
    if (typeof childNode === 'function') {
      const cleanup = effect(() => {
        const childValue = childNode();
        if (node && node.childNodes[i]) {
          node.childNodes[i].textContent = childValue as string;
        }
      });
      cleanups.push(cleanup);
    }
  }
  return cleanups.length > 0 ? () => cleanups.forEach(cleanup => cleanup()) : undefined;
}

// Optimized reorderListNodes to minimize DOM operations
export function reorderList(
  parent: Node,
  newKeys: string[],
  lastKeys: string[],
  newKeyToItem: Map<string, ListItem>
): void {
  // Map current positions of nodes
  const keyToIndex = new Map<string, number>();
  for (let i = 0; i < lastKeys.length; i++) {
    keyToIndex.set(lastKeys[i], i);
  }

  // Process nodes in new order, moving only what's necessary
  for (let i = 0; i < newKeys.length; i++) {
    const key = newKeys[i];
    const item = newKeyToItem.get(key)!;
    const node = item.node;
    const currentNode = parent.childNodes[i];

    // Skip if node is already in the correct position
    if (node === currentNode) continue;

    // Get the expected previous node (if any)
    const prevKey = i > 0 ? newKeys[i - 1] : null;
    const prevNode = prevKey ? newKeyToItem.get(prevKey)?.node.nextSibling : parent.firstChild;

    // Only move if the node is not in the correct relative position
    if (node !== prevNode) {
      parent.insertBefore(node, currentNode || null);
    }
  }
}