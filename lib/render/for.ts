import type { VNode } from "../types";
import { createOrReuseItem, EventDelegator, listMap, performSwap, removeItem, reorderList, type ListItem } from "../dom";
import { rootRegistry } from "./render";


// Main renderFor function
export function renderFor(
  items: VNode[],
  vNode: () => unknown,
  parent: Node,
  domNode: Node | null,
  rootSelector: string
): void {
  // Initialize or retrieve state
  const state = listMap.get(vNode) || {
    keyToItem: new Map<string, ListItem>(),
    lastKeys: [],
  };
  const newKeys: string[] = [];
  const newKeyToItem = new Map<string, ListItem>();
  const delegator = rootRegistry.get(rootSelector) as EventDelegator;

  // Collect new keys and items
  for (let index = 0, len = items.length; index < len; index++) {
    const child = items[index];
    const key = child.props.key as string;

    if (!key) continue;

    newKeys.push(key);

    const existingItem = state.keyToItem.get(key);
    if (existingItem && existingItem.node.parentNode === parent) {
      newKeyToItem.set(key, existingItem);
    } else {
      const newItem = createOrReuseItem(child, parent, rootSelector, existingItem);
      if (newItem) newKeyToItem.set(key, newItem);
    }
  }

  // Check for swap optimization
  let isSwap = false;
  let swapIndex1 = -1;
  let swapIndex2 = -1;
  if (newKeys.length === state.lastKeys.length) {
    let differences = 0;
    for (let i = 0; i < newKeys.length; i++) {
      if (newKeys[i] !== state.lastKeys[i]) {
        differences++;
        if (differences === 1) swapIndex1 = i;
        else if (differences === 2) swapIndex2 = i;
        else break;
      }
    }
    isSwap =
      differences === 2 &&
      newKeys[swapIndex1] === state.lastKeys[swapIndex2] &&
      newKeys[swapIndex2] === state.lastKeys[swapIndex1];
  }

  if (isSwap) {
    performSwap(parent, newKeys, swapIndex1, swapIndex2, newKeyToItem, state);
  } else {
    // Handle additions, removals, and reordering
    const addedKeys = new Set(newKeys);
    const removedKeys = new Set(state.lastKeys.filter((k) => !addedKeys.has(k)));
    const isSimpleRemoval = removedKeys.size === 1 && newKeys.length === state.lastKeys.length - 1;
    let hasOrderChanges = false;

    if (!isSimpleRemoval) {
      for (let i = 0; i < Math.min(newKeys.length, state.lastKeys.length); i++) {
        if (newKeys[i] !== state.lastKeys[i]) {
          hasOrderChanges = true;
          break;
        }
      }
    }

    if (isSimpleRemoval) {
      const removedKey = Array.from(removedKeys)[0];
      const removedItem = state.keyToItem.get(removedKey);
      if (removedItem) removeItem(removedItem, parent, delegator);
    } else {
      // Handle removals
      for (const [key, item] of state.keyToItem) {
        if (removedKeys.has(key)) removeItem(item, parent, delegator);
      }

      // Handle additions and reordering
      if (removedKeys.size > 0 || addedKeys.size > state.lastKeys.length || hasOrderChanges) {
        const fragment = document.createDocumentFragment();
        for (const key of newKeys) {
          const item = newKeyToItem.get(key);
          if (item) fragment.appendChild(item.node);
        }
        while (parent.firstChild) {
          parent.removeChild(parent.firstChild);
        }
        parent.appendChild(fragment);
      } else if (hasOrderChanges) {
        reorderList(parent, newKeys, state.lastKeys, newKeyToItem);
      }
    }

    // Update state
    state.keyToItem.clear();
    state.lastKeys = newKeys;
    for (const [key, item] of newKeyToItem) {
      state.keyToItem.set(key, item);
    }
  }

  // Update listMap and domNode
  listMap.set(vNode, state);
  if (newKeys.length === 0) {
    listMap.delete(vNode);
  }

  if (domNode === null && newKeys.length > 0) {
    domNode = state.keyToItem.get(newKeys[0])?.node || null;
  }
}