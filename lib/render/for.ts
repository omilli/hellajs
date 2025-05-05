import { createOrReuseItem, EventDelegator, listMap, removeItem, reorderList, type ListItem } from "../dom";
import type { VNode } from "../types";
import { rootRegistry } from "./render";

export function renderFor(
  items: VNode[],
  vNode: () => unknown,
  parent: Node,
  domNode: Node | null,
  rootSelector: string
): void {
  const state = listMap.get(vNode) || { keyToItem: new Map<string, ListItem>(), lastKeys: [] };
  const newKeys: string[] = [];
  const newKeyToItem = new Map<string, ListItem>();
  const delegator = rootRegistry.get(rootSelector) as EventDelegator;

  // Collect new items
  for (let i = 0; i < items.length; i++) {
    const child = items[i];
    const key = child.props.key as string;
    if (!key) continue;

    newKeys.push(key);
    const existingItem = state.keyToItem.get(key);
    if (existingItem && existingItem.node && existingItem.node.parentNode === parent) {
      newKeyToItem.set(key, existingItem);
    } else {
      const newItem = createOrReuseItem(child, parent, rootSelector, existingItem);
      if (newItem) newKeyToItem.set(key, newItem);
    }
  }

  // Detect swap optimization
  let swapIndices: [number, number] | null = null;
  if (newKeys.length === state.lastKeys.length) {
    let differences = 0;
    let firstDiff = -1;
    let secondDiff = -1;
    for (let i = 0; i < newKeys.length; i++) {
      if (newKeys[i] !== state.lastKeys[i]) {
        if (differences === 0) firstDiff = i;
        else if (differences === 1) secondDiff = i;
        differences++;
        if (differences > 2) break;
      }
    }
    if (
      differences === 2 &&
      newKeys[firstDiff] === state.lastKeys[secondDiff] &&
      newKeys[secondDiff] === state.lastKeys[firstDiff]
    ) {
      swapIndices = [firstDiff, secondDiff];
    }
  }

  // Process changes
  const removedKeys = new Set(state.lastKeys.filter((k) => !newKeyToItem.has(k)));
  const isSingleRemoval = removedKeys.size === 1 && newKeys.length === state.lastKeys.length - 1;
  const hasOrderChanges = newKeys.some((k, i) => k !== state.lastKeys[i]);

  if (swapIndices) {
    const [i, j] = swapIndices;
    const item1 = newKeyToItem.get(newKeys[i])!;
    const item2 = newKeyToItem.get(newKeys[j])!;
    // Swap the two nodes in place
    const node1 = item1.node;
    const node2 = item2.node;
    const next1 = node1.nextSibling;
    const next2 = node2.nextSibling;
    if (next1 === node2) {
      // node1 is immediately before node2
      parent.insertBefore(node2, node1);
    } else if (next2 === node1) {
      // node2 is immediately before node1
      parent.insertBefore(node1, node2);
    } else {
      parent.insertBefore(node2, node1);
      parent.insertBefore(node1, next2);
    }
  } else if (isSingleRemoval) {
    const key = Array.from(removedKeys)[0];
    const item = state.keyToItem.get(key);
    if (item) removeItem(item, parent, delegator);
  } else {
    // Handle removals
    for (const key of removedKeys) {
      const item = state.keyToItem.get(key);
      if (item) removeItem(item, parent, delegator);
    }

    // Handle additions and reordering
    if (removedKeys.size > 0 || newKeys.length > state.lastKeys.length || hasOrderChanges) {
      const fragment = document.createDocumentFragment();
      for (const key of newKeys) {
        const item = newKeyToItem.get(key);
        if (item) fragment.appendChild(item.node);
      }
      while (parent.firstChild) parent.removeChild(parent.firstChild);
      parent.appendChild(fragment);
    }
  }

  // Update state
  state.keyToItem.clear();
  state.lastKeys = newKeys;
  for (const [key, item] of newKeyToItem) {
    state.keyToItem.set(key, item);
  }

  // Update listMap and domNode
  if (newKeys.length === 0) {
    listMap.delete(vNode);
  } else {
    listMap.set(vNode, state);
    if (domNode === null) {
      domNode = state.keyToItem.get(newKeys[0])?.node || null;
    }
  }
}