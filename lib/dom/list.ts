import { effect } from "../reactive";
import type { ContextElement, VNode } from "../types";
import { createElement } from "./element";
import { EventDelegator } from "./event";

export interface ListItem {
  node: Node;
  effectCleanup?: () => void;
}

// Interface for list state to improve type safety
export interface ListState {
  keyToItem: Map<string, ListItem>;
  lastKeys: string[];
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


// Helper function to create or reuse a list item
export function createOrReuseItem(
  child: VNode,
  parent: Node,
  rootSelector: string,
  existingItem?: ListItem
): ListItem | undefined {
  let node = existingItem?.node;
  let effectCleanup = existingItem?.effectCleanup;

  if (effectCleanup && !node) {
    effectCleanup();
    effectCleanup = undefined;
  }

  if (!effectCleanup) {
    effectCleanup = bindList(child, node!);
  }

  if (!node) {
    node = createElement(child, parent, rootSelector) as Node;
  }

  return node ? { node, effectCleanup } : undefined;
}

// Helper function to remove an item from the DOM
export function removeItem(
  item: ListItem,
  parent: Node,
  delegator: EventDelegator
): void {
  if (item.node.parentNode === parent) {
    if (item.effectCleanup) item.effectCleanup();
    const context = (item.node as ContextElement)._context;
    if (context) context.cleanup();
    if (item.node instanceof HTMLElement) {
      delegator?.removeHandlersForElement(item.node);
    }
    parent.removeChild(item.node);
  }
}

// Helper function to perform a swap optimization
export function performSwap(
  parent: Node,
  newKeys: string[],
  swapIndex1: number,
  swapIndex2: number,
  newKeyToItem: Map<string, ListItem>,
  state: ListState
): void {
  const item1 = newKeyToItem.get(newKeys[swapIndex1])!;
  const item2 = newKeyToItem.get(newKeys[swapIndex2])!;
  const node1 = item1.node;
  const node2 = item2.node;
  const nextSibling1 = node1.nextSibling;

  parent.insertBefore(node1, node2);
  parent.insertBefore(node2, nextSibling1);

  state.lastKeys = [...newKeys];
  state.keyToItem.clear();
  for (const [key, item] of newKeyToItem) {
    state.keyToItem.set(key, item);
  }
}