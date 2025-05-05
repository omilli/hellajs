import { createOrReuseItem, EventDelegator, listMap, removeItem, type ListItem } from "../dom";
import type { VNode } from "../types";
import { rootRegistry } from "./render";

export function renderFor(
  items: VNode[],
  vNode: () => unknown,
  parent: Node,
  domNode: Node | null,
  rootSelector: string
): void {
  // Get or create state for this vNode
  const state = listMap.get(vNode) || { keyToItem: new Map<string, ListItem>(), lastKeys: [] };
  const prevKeys = state.lastKeys;
  const prevKeyToItem = state.keyToItem;
  const nextKeys: string[] = [];
  const nextKeyToItem = new Map<string, ListItem>();
  const delegator = rootRegistry.get(rootSelector) as EventDelegator;

  // 1. Build nextKeyToItem and nextKeys, reusing nodes where possible
  for (let i = 0; i < items.length; i++) {
    const child = items[i];
    const key = child.props.key as string;
    if (!key) continue;
    nextKeys.push(key);
    let item = prevKeyToItem.get(key);
    if (!item || !item.node || item.node.parentNode !== parent) {
      item = createOrReuseItem(child, parent, rootSelector, item);
    }
    if (item) nextKeyToItem.set(key, item);
  }

  // 2. Remove nodes that are no longer present
  for (const key of prevKeys) {
    if (!nextKeyToItem.has(key)) {
      const item = prevKeyToItem.get(key);
      if (item) removeItem(item, parent, delegator);
    }
  }

  // 3. Detect swap optimization
  let swapIndices: [number, number] | null = null;
  if (nextKeys.length === prevKeys.length) {
    let differences = 0;
    let firstDiff = -1;
    let secondDiff = -1;
    for (let i = 0; i < nextKeys.length; i++) {
      if (nextKeys[i] !== prevKeys[i]) {
        if (differences === 0) firstDiff = i;
        else if (differences === 1) secondDiff = i;
        differences++;
        if (differences > 2) break;
      }
    }
    if (
      differences === 2 &&
      nextKeys[firstDiff] === prevKeys[secondDiff] &&
      nextKeys[secondDiff] === prevKeys[firstDiff]
    ) {
      swapIndices = [firstDiff, secondDiff];
    }
  }

  if (swapIndices) {
    // Only swap the two nodes
    const [i, j] = swapIndices;
    const item1 = nextKeyToItem.get(nextKeys[i])!;
    const item2 = nextKeyToItem.get(nextKeys[j])!;
    const node1 = item1.node;
    const node2 = item2.node;
    const next1 = node1.nextSibling;
    const next2 = node2.nextSibling;
    if (next1 === node2) {
      parent.insertBefore(node2, node1);
    } else if (next2 === node1) {
      parent.insertBefore(node1, node2);
    } else {
      parent.insertBefore(node2, node1);
      parent.insertBefore(node1, next2);
    }
  } else {
    // Efficiently reorder/insert nodes with minimal DOM ops
    let domChild = parent.firstChild;
    for (let i = 0; i < nextKeys.length; i++) {
      const key = nextKeys[i];
      const item = nextKeyToItem.get(key)!;
      if (item.node === domChild) {
        domChild = domChild!.nextSibling;
        continue;
      }
      parent.insertBefore(item.node, domChild);
      // domChild remains the same
    }
  }

  // 4. Update state
  state.keyToItem = nextKeyToItem;
  state.lastKeys = nextKeys;
  if (nextKeys.length === 0) {
    listMap.delete(vNode);
  } else {
    listMap.set(vNode, state);
    if (domNode === null) {
      domNode = nextKeyToItem.get(nextKeys[0])?.node || null;
    }
  }
}