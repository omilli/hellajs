import { isHellaNode, resolveValue } from "./internal/utils";
import { registry } from "./registry";
import { resolveNode } from "./internal/render";
import { cleanupSubtree } from "./internal/cleanup";
import type { ForEachProps } from "./types/nodes";

/**
 * Renders and updates a list of items using keyed reconciliation.
 * Uses LIS algorithm to minimize DOM moves with multiple fast paths for optimal performance.
 * @template T
 * @param props Component props with each and use
 * @returns Function that mounts the list into a parent element
 */
export function ForEach<T>(props: ForEachProps<T>): JSX.Element {
  const { each, use } = props;
  const fn = ((parent: Element) => {
    let keyToNode = new Map<unknown, Node>(),
      keyToItem = new Map<unknown, T>(),
      currentKeys: unknown[] = [];

    let newKeys: unknown[] = [];
    let newKeyToNode = new Map<unknown, Node>();
    let newKeyToItem = new Map<unknown, T>();
    const nodesToRemove: Node[] = [];
    const keyToOldIndex = new Map<unknown, number>();
    const toMove = new Set<number>();

    const startMarker = document.createComment("forEach");
    const endMarker = document.createComment("forEach");
    parent.appendChild(startMarker);
    parent.appendChild(endMarker);

    registry.addEffect(parent, () => {
      const actualParent = startMarker.parentNode as Element;
      if (!actualParent) return;

      const arr: T[] = resolveValue(each) as T[];

      if (arr.length > 0) {
        if (currentKeys.length === 0) {
          const fragment = document.createDocumentFragment();
          const arrLen = arr.length;
          let index = 0;
          while (index < arrLen) {
            const item = arr[index]!;
            const element = use(item, index);
            const key = element && isHellaNode(element)
              ? element.props?.key ?? (item as { id?: unknown })?.id ?? index
              : (item as { id?: unknown })?.id ?? index;
            const node = resolveNode(element);
            fragment.appendChild(node);
            keyToNode.set(key, node);
            keyToItem.set(key, item);
            currentKeys.push(key);
            index++;
          }
          actualParent.insertBefore(fragment, endMarker);
          return;
        }

        newKeys.length = 0;
        newKeyToNode.clear();
        newKeyToItem.clear();
        nodesToRemove.length = 0;

        const arrLen = arr.length;
        let index = 0;
        while (index < arrLen) {
          const item = arr[index]!;
          const element = use(item, index);

          let key: unknown;
          let hasExplicitKey = false;
          if (element && isHellaNode(element)) {
            if (element.props?.key !== undefined) {
              key = element.props.key;
              hasExplicitKey = true;
            } else if ((item as { id?: unknown })?.id !== undefined) {
              key = (item as { id?: unknown }).id;
              hasExplicitKey = true;
            } else {
              key = index;
            }
          } else if ((item as { id?: unknown })?.id !== undefined) {
            key = (item as { id?: unknown }).id;
            hasExplicitKey = true;
          } else {
            key = index;
          }

          newKeys.push(key);

          let node = keyToNode.get(key);
          const oldItem = keyToItem.get(key);
          if (!node || (!hasExplicitKey && oldItem !== item)) {
            node = resolveNode(element);
          }
          newKeyToNode.set(key, node);
          newKeyToItem.set(key, item);
          index++;
        }

        const existingKeys = Array.from(keyToNode.keys());
        let ki = 0;
        const kLen = existingKeys.length;
        while (ki < kLen) {
          const key = existingKeys[ki++]!;
          const node = keyToNode.get(key)!;
          if (node.parentNode !== actualParent) continue;
          const newNode = newKeyToNode.get(key);
          (!newNode || newNode !== node) && nodesToRemove.push(node);
        }

        let ri = 0;
        const rLen = nodesToRemove.length;
        while (ri < rLen) {
          const rNode = nodesToRemove[ri]!;
          cleanupSubtree(rNode);
          actualParent.removeChild(rNode);
          ri++;
        }

        let hasMatchingKey = false;
        const newKeysLen = newKeys.length;
        let k = 0;
        while (k < newKeysLen) {
          if (keyToNode.has(newKeys[k])) {
            hasMatchingKey = true;
            break;
          }
          k++;
        }
        if (!hasMatchingKey && newKeysLen > 0) {
          const fragment = document.createDocumentFragment();
          let fi = 0;
          const fLen = newKeys.length;
          while (fi < fLen) {
            fragment.appendChild(newKeyToNode.get(newKeys[fi]!)!);
            fi++;
          }
          actualParent.insertBefore(fragment, endMarker);
        } else {
          keyToOldIndex.clear();
          toMove.clear();
          const currentKeysLen = currentKeys.length,
            newKeysLen = newKeys.length;
          let i = 0;
          while (i < newKeysLen) {
            toMove.add(i);
            i++;
          }

          i = 0;
          while (i < currentKeysLen) {
            keyToOldIndex.set(currentKeys[i], i);
            i++;
          }

          const mapped = new Array(newKeysLen);
          i = 0;
          while (i < newKeysLen) {
            const key = newKeys[i];
            const oldNode = keyToNode.get(key);
            const newNode = newKeyToNode.get(key);
            mapped[i] = oldNode && oldNode === newNode ? (keyToOldIndex.get(key) ?? -1) : -1;
            i++;
          }

          const n = mapped.length;
          const tails: number[] = [];
          const prevIndices = new Array(n).fill(-1);
          let keyIndexed = 0;

          if (n === 0) return [];

          while (keyIndexed < n) {
            if (mapped[keyIndexed] === -1) {
              keyIndexed++;
              continue;
            }

            let left = 0, right = tails.length;

            while (left < right) {
              const mid = Math.floor((left + right) / 2);
              mapped[tails[mid]!] < mapped[keyIndexed] ? (left = mid + 1) : (right = mid);
            }

            left > 0 && (prevIndices[keyIndexed] = tails[left - 1]);

            left === tails.length ? tails.push(keyIndexed) : (tails[left] = keyIndexed);
            keyIndexed++;
          }

          const lis: number[] = [];
          if (tails.length > 0) {
            let curr = tails[tails.length - 1]!;
            while (curr !== -1) {
              lis.unshift(curr);
              curr = prevIndices[curr]!;
            }
          }

          const lisLen = lis.length;
          let j = 0;
          while (j < lisLen) {
            toMove.delete(lis[j]!);
            j++;
          }

          let anchor: Node | null = endMarker;
          i = newKeys.length - 1;

          while (i >= 0) {
            const node = newKeyToNode.get(newKeys[i])!;
            toMove.has(i) && actualParent.insertBefore(node, anchor);
            anchor = node;
            i--;
          }
        }

        const tempNode = keyToNode;
        const tempItem = keyToItem;
        const tempKeys = currentKeys;
        keyToNode = newKeyToNode;
        keyToItem = newKeyToItem;
        currentKeys = newKeys;
        newKeyToNode = tempNode;
        newKeyToItem = tempItem;
        newKeys = tempKeys;
      }
      else {
        let currentNode = startMarker.nextSibling;
        while (currentNode !== endMarker) {
          const next = currentNode!.nextSibling;
          cleanupSubtree(currentNode!);
          actualParent.removeChild(currentNode!);
          currentNode = next;
        }

        keyToNode.clear();
        keyToItem.clear();
        currentKeys.length = 0;
      }
    });
  }) as JSX.Element;

  fn.isDynamic = true;
  return fn;
}
