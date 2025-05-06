import { effect } from "../reactive";
import type { VNode } from "../types";
import { createElement } from "./element";

export interface ListItem {
  node: Node;
  effectCleanup?: () => void;
}

export interface ListState {
  keyToItem: Map<string, ListItem>;
  lastKeys: string[];
}

export const listMap = new WeakMap<() => unknown, ListState>();

export function bindList(child: VNode, node: Node): (() => void) | undefined {
  if (!node) return;
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

  if (!node) {
    node = createElement(child, parent, rootSelector) as Node;
    effectCleanup = bindList(child, node!);
  }

  return node ? { node, effectCleanup } : undefined;
}

export function removeItem(
  item: ListItem,
  parent: Node,
  delegator: { removeHandlersForElement: (el: HTMLElement) => void }
): void {
  if (item.node.parentNode === parent) {
    if (item.effectCleanup) item.effectCleanup();
    if (item.node instanceof HTMLElement) {
      delegator?.removeHandlersForElement(item.node);
    }
    parent.removeChild(item.node);
  }
}
