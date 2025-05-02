import type { VNode } from "../types";
import type { ComponentElement } from "../ui";
import { createElement } from "./element";
import { bindList, listMap, reorderList, type ListItem } from "./list";
import { rootRegistry } from "./render";

export function renderFor(
  items: VNode[],
  vNode: () => unknown,
  parent: Node,
  domNode: Node | null,
  rootSelector: string
): void {
  const state = listMap.get(vNode) || {
    keyToItem: new Map<string, ListItem>(),
    lastKeys: []
  };

  const newKeys: string[] = [];
  const newKeyToItem = new Map<string, ListItem>();
  const delegator = rootRegistry.get(rootSelector);

  // Step 1: Collect new keys and items
  for (let index = 0, len = items.length; index < len; index++) {
    const child = items[index];
    const key = child.props.key as string;

    if (!key) continue;

    newKeys.push(key);

    const existingItem = state.keyToItem.get(key);
    if (existingItem && existingItem.node.parentNode === parent) {
      newKeyToItem.set(key, existingItem);
    } else {
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
        const newNode = createElement(child, parent, rootSelector);
        if (newNode) node = newNode;
      }

      if (node) {
        newKeyToItem.set(key, {
          node,
          effectCleanup
        });
      }
    }
  }

  // Step 2: Detect swap optimization
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
    // Check if it's a swap (two differences where keys are swapped)
    if (
      differences === 2 &&
      newKeys[swapIndex1] === state.lastKeys[swapIndex2] &&
      newKeys[swapIndex2] === state.lastKeys[swapIndex1]
    ) {
      isSwap = true;
    }
  }

  if (isSwap) {
    // Optimized swap: Move only the two affected nodes
    const item1 = newKeyToItem.get(newKeys[swapIndex1])!;
    const item2 = newKeyToItem.get(newKeys[swapIndex2])!;
    const node1 = item1.node;
    const node2 = item2.node;
    const nextSibling1 = node1.nextSibling;

    // Swap nodes in the DOM
    parent.insertBefore(node1, node2);
    parent.insertBefore(node2, nextSibling1);

    // Update lastKeys to reflect the swap
    state.lastKeys = [...newKeys];

    // Ensure keyToItem stays in sync with lastKeys
    state.keyToItem.clear();
    for (const [key, item] of newKeyToItem) {
      state.keyToItem.set(key, item);
    }
  } else {
    // Step 3: Handle additions, removals, and reordering
    const addedKeys = new Set(newKeys);
    const removedKeys = new Set(state.lastKeys.filter(k => !addedKeys.has(k)));
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
      // Optimized path for removing a single item
      const removedKey = Array.from(removedKeys)[0];
      const removedItem = state.keyToItem.get(removedKey);
      if (removedItem && removedItem.node.parentNode === parent) {
        if (removedItem.effectCleanup) removedItem.effectCleanup();
        const context = (removedItem.node as ComponentElement).__componentContext;
        if (context) context.cleanup();
        if (removedItem.node instanceof HTMLElement) {
          delegator?.removeHandlersForElement(removedItem.node);
        }
        parent.removeChild(removedItem.node);
      }
    } else {
      // Handle removals
      for (const [key, item] of state.keyToItem) {
        if (removedKeys.has(key) && item.node.parentNode === parent) {
          if (item.effectCleanup) item.effectCleanup();
          const context = (item.node as ComponentElement).__componentContext;
          if (context) context.cleanup();
          if (item.node instanceof HTMLElement) {
            delegator?.removeHandlersForElement(item.node);
          }
          parent.removeChild(item.node);
        }
      }

      // Handle additions and reordering
      if (removedKeys.size > 0 || addedKeys.size > state.lastKeys.length || hasOrderChanges) {
        // Use a fragment to minimize reflows
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < newKeys.length; i++) {
          const item = newKeyToItem.get(newKeys[i]);
          if (item) fragment.appendChild(item.node);
        }
        while (parent.firstChild) {
          parent.removeChild(parent.firstChild);
        }
        parent.appendChild(fragment);
      } else if (hasOrderChanges) {
        // Optimized reordering
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

  // Step 4: Update listMap and domNode
  listMap.set(vNode, state);
  if (newKeys.length === 0) {
    listMap.delete(vNode);
  }

  if (domNode === null && newKeys.length > 0) {
    domNode = state.keyToItem.get(newKeys[0])?.node || null;
  }
}