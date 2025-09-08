import { addRegistryEffect } from "./cleanup";
import { type Signal } from "./core";
import { resolveNode } from "./mount";
import type { ForEach } from "./types";
import { appendChild, createComment, EMPTY, FOR_EACH, insertBefore, isFunction, isHellaNode, removeChild } from "./utils";

/**
 * Efficiently renders and updates a list of items in the DOM.
 * @template T
 * @param each The list of items to render.
 * @param use The render function for each item.
 * @returns A function that renders the list to a parent element.
 */
export function forEach<T>(
  each: T[] | Signal<T[]> | (() => T[]),
  use: ForEach<T>
) {
  const fn = (parent: Element) => {
    let keyToNode = new Map<unknown, Node>(),
      currentKeys: unknown[] = [];

    addRegistryEffect(parent, () => {
      // Resolve data source - function, signal, or static array
      let arr = isFunction(each) ? each() : each || [],
        newKeys: unknown[] = [],
        newKeyToNode = new Map<unknown, Node>();

      // Fast path: Clear list when empty
      if (arr.length === 0) {
        parent.textContent = EMPTY;
        appendChild(parent, createComment(FOR_EACH));
        keyToNode.clear();
        currentKeys = [];
        return;
      }

      // Build key mapping and create/reuse nodes
      for (let index = 0; index < arr.length; index++) {
        const element = use(arr[index], index);
        const key = element && isHellaNode(element)
          ? element.props?.key ?? index
          : index;

        newKeys.push(key);

        let node = keyToNode.get(key);
        !node && (node = resolveNode(element, parent));
        newKeyToNode.set(key, node);
      }

      // Cleanup: Remove nodes that are no longer needed
      for (const [key, node] of keyToNode)
        !newKeyToNode.has(key) && node.parentNode === parent && removeChild(parent, node);

      // Fast path: First render - append all nodes in order
      if (currentKeys.length === 0) {
        for (const key of newKeys)
          appendChild(parent, newKeyToNode.get(key)!);
      } else {
        // Fast path: Same length and keys match - check for simple reorder
        let hasAnyChanges = false;
        if (currentKeys.length === newKeys.length) {
          let i = 0, len = currentKeys.length;
          for (; i < len; i++) {
            if (currentKeys[i] !== newKeys[i]) {
              hasAnyChanges = true;
              break;
            }
          }
          // Ultra fast path: Array is identical, no DOM changes needed
          if (!hasAnyChanges) {
            keyToNode = newKeyToNode;
            currentKeys = newKeys;
            return;
          }
        }

        // Fast path: Complete replacement when no keys match
        if (newKeys.filter(key => keyToNode.has(key)).length === 0 && newKeys.length > 0) {
          parent.firstChild && removeChild(parent, parent.firstChild);
          for (const key of newKeys)
            appendChild(parent, newKeyToNode.get(key)!);
        } else {
          // Complex path: Minimal DOM operations using Longest Increasing Subsequence
          // Create mapping from old positions to optimize reordering
          const keyToOldIndex = new Map(),
            toMove = new Set(newKeys.map((_, i) => i));

          for (let i = 0; i < currentKeys.length; i++)
            keyToOldIndex.set(currentKeys[i], i);

          // Map new keys to their old positions (-1 for new items)
          const newKeysLen = newKeys.length;
          const mapped = new Array(newKeysLen);
          for (let i = 0; i < newKeysLen; i++)
            mapped[i] = keyToOldIndex.get(newKeys[i]) ?? -1;

          // Compute Longest Increasing Subsequence to find stable elements
          let n = mapped.length,
            tails: number[] = [],
            prevIndices = new Array(n).fill(-1),
            keyInded = 0;

          if (n === 0) return [];

          // Build LIS using binary search for efficiency
          for (keyInded; keyInded < n; keyInded++) {
            if (mapped[keyInded] === -1) continue;

            let left = 0, right = tails.length;

            while (left < right) {
              const mid = Math.floor((left + right) / 2);
              mapped[tails[mid]] < mapped[keyInded] ? (left = mid + 1) : (right = mid);
            }

            left > 0 && (prevIndices[keyInded] = tails[left - 1]);

            left === tails.length ? tails.push(keyInded) : (tails[left] = keyInded);
          }

          // Reconstruct LIS to identify elements that don't need moving
          let lis: number[] = [],
            curr = tails[tails.length - 1];

          while (curr !== -1) {
            lis.unshift(curr);
            curr = prevIndices[curr];
          }

          // Mark stable elements as not needing movement
          const lisLen = lis.length;
          for (let j = 0; j < lisLen; j++)
            toMove.delete(lis[j]);

          // Reorder: Move only elements that need repositioning (backwards to maintain order)
          let anchor: Node | null = null, i = newKeys.length - 1;

          for (i; i >= 0; i--) {
            const node = newKeyToNode.get(newKeys[i])!;
            toMove.has(i) && insertBefore(parent, node, anchor);
            anchor = node;
          }
        }
      }

      // Update state for next render cycle
      keyToNode = newKeyToNode;
      currentKeys = newKeys;
    });
  };

  fn.isForEach = true;
  return fn;
}