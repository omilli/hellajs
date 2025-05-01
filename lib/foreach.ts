import { effect } from "./reactive";
import type { ListItem, Signal, VNode } from "./types";
import { Component } from "./component";

export const listMap = new WeakMap<() => unknown, {
  keyToItem: Map<string, ListItem>,
  lastKeys: string[]
}>();

export function ForEach<T>(
  data: Signal<T[]>,
  mapFn: (item: T, index: number) => VNode
) {
  return () => data().map((item, index) => {
    const node = mapFn(item, index);
    if ('id' in (item as object) && !('key' in node.props)) {
      node.props.key = (item as unknown as { id: string | number }).id;
    }
    (node as unknown as VNode & { __item: T }).__item = item;
    return node;
  });
}

export function extractKeyFromItem(child: VNode, index: number): string | null {
  let key: string | null = null;
  let storeItem: Signal<{}> | undefined;

  if ('__item' in child) {
    storeItem = child.__item as Signal<{}>;

    if ('key' in storeItem) {
      key = child.props.key as string;
    } else if ('id' in storeItem) {
      key = (storeItem as unknown as { id: string | number }).id as string;
    }
  }

  return key;
}

export function setupListBindings(child: VNode, node: Node): (() => void) | undefined {
  const childNodes = child.children || [];
  for (let i = 0, len = childNodes.length; i < len; i++) {
    const childNode = childNodes[i];
    if (typeof childNode === 'function') {
      effect(() => {
        const childValue = childNode();
        if (node && node.childNodes[i]) {
          node.childNodes[i].textContent = childValue as string;
        }
      });
    }
  }
  return undefined;
}

export function reorderListNodes(
  parent: Node,
  newKeys: string[],
  lastKeys: string[],
  newKeyToItem: Map<string, ListItem>
): void {
  for (let i = 0; i < newKeys.length; i++) {
    if (newKeys.length === lastKeys.length && newKeys[i] === lastKeys[i]) {
      continue;
    }

    const item = newKeyToItem.get(newKeys[i])!;
    const node = item.node;
    const currentNode = parent.childNodes[i];

    if (node !== currentNode) {
      parent.insertBefore(node, currentNode || null);
    }
  }
}