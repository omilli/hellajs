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
  const fn = function (parent: Element) {
    let keyToNode = new Map<unknown, Node>(),
      currentKeys: unknown[] = [];

    addRegistryEffect(parent, () => {
      let arr = isFunction(each) ? each() : each || [],
        newKeys: unknown[] = [],
        newKeyToNode = new Map<unknown, Node>();

      if (arr.length === 0) {
        parent.textContent = EMPTY;
        appendChild(parent, createComment(FOR_EACH));
        keyToNode.clear();
        currentKeys = [];
        return;
      }

      // Build new key list and reuse existing nodes
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

      // Remove unused nodes
      for (const [key, node] of keyToNode)
        !newKeyToNode.has(key) && node.parentNode === parent && removeChild(parent, node);

      // Optimized reordering using LIS to minimize DOM operations
      if (currentKeys.length === 0) {
        // First render - just append all
        for (const key of newKeys)
          appendChild(parent, newKeyToNode.get(key)!);
      } else {
        // Check if we have any matching keys - if none match, do complete replacement
        if (newKeys.filter(key => keyToNode.has(key)).length === 0 && newKeys.length > 0) {
          // Complete replacement - clear and rebuild
          parent.firstChild && removeChild(parent, parent.firstChild);
          for (const key of newKeys)
            appendChild(parent, newKeyToNode.get(key)!);
        } else {
          // Create position mapping for partial updates
          const keyToOldIndex = new Map(),
            toMove = new Set(newKeys.map((_, i) => i));

          for (let i = 0; i < currentKeys.length; i++)
            keyToOldIndex.set(currentKeys[i], i);

          const newKeysLen = newKeys.length;
          const mapped = new Array(newKeysLen);
          for (let i = 0; i < newKeysLen; i++)
            mapped[i] = keyToOldIndex.get(newKeys[i]) ?? -1;

          let n = mapped.length,
            tails: number[] = [],
            prevIndices = new Array(n).fill(-1),
            keyInded = 0;

          if (n === 0) return [];

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

          // Reconstruct LIS
          let lis: number[] = [],
            curr = tails[tails.length - 1];

          while (curr !== -1) {
            lis.unshift(curr);
            curr = prevIndices[curr];
          }

          const lisLen = lis.length;
          for (let j = 0; j < lisLen; j++)
            toMove.delete(lis[j]);


          // Move only nodes that need moving (backwards to preserve order)
          let anchor: Node | null = null, i = newKeys.length - 1;

          for (i; i >= 0; i--) {
            const node = newKeyToNode.get(newKeys[i])!;
            toMove.has(i) && insertBefore(parent, node, anchor);
            anchor = node;
          }
        }
      }
      keyToNode = newKeyToNode;
      currentKeys = newKeys;
    });
  };

  fn.isForEach = true;
  return fn;
}