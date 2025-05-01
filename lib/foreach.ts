import { effect } from "./reactive";
import type { ListItem, Signal, VNode } from "./types";

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
    (node as unknown as VNode & { __item: T }).__item = item;
    return node;
  });
}

export function setupListBindings(child: VNode, node: Node): (() => void) | undefined {
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

export function reorderListNodes(
  parent: Node,
  newKeys: string[],
  lastKeys: string[],
  newKeyToItem: Map<string, ListItem>
): void {
  for (let i = 0; i < newKeys.length; i++) {
    if (newKeys[i] === lastKeys[i]) {
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