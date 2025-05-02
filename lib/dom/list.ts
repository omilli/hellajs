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

export interface ListItem {
  node: Node;
  effectCleanup?: () => void;
}

export const listMap = new WeakMap<() => unknown, ListState>();

// Bind reactive effects to a node's children
export function bindList(child: VNode, node: Node): (() => void) | undefined {
  const childNodes = child.children || [];
  const cleanups: (() => void)[] = [];
  for (let i = 0; i < childNodes.length; i++) {
    const childNode = childNodes[i];
    if (typeof childNode === "function") {
      const cleanup = effect(() => {
        const value = childNode();
        if (node.childNodes[i]) {
          node.childNodes[i].textContent = value as string;
        }
      });
      cleanups.push(cleanup);
    }
  }
  return cleanups.length > 0 ? () => cleanups.forEach((c) => c()) : undefined;
}

// Create or reuse a list item
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

// Remove an item from the DOM
export function removeItem(
  item: ListItem,
  parent: Node,
  delegator: { removeHandlersForElement: (el: HTMLElement) => void }
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

// Optimized reordering to minimize DOM moves
export function reorderList(
  parent: Node,
  newKeys: string[],
  newKeyToItem: Map<string, ListItem>
): void {
  for (let i = 0; i < newKeys.length; i++) {
    const key = newKeys[i];
    const item = newKeyToItem.get(key)!;
    const currentNode = parent.childNodes[i];
    if (item.node !== currentNode) {
      parent.insertBefore(item.node, currentNode || null);
    }
  }
}