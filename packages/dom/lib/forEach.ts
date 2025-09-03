import { addRegistryEffect } from "./cleanup";
import { type Signal } from "./core";
import { resolveNode } from "./mount";
import type { ForEach } from "./types";
import { DOC, isFunction, isHellaNode } from "./utils";

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
        newKeyToNode = new Map<unknown, Node>(),
        i = 0;

      if (arr.length === 0) {
        parent.textContent = "";
        parent.appendChild(DOC.createComment("forEach"));
        keyToNode.clear();
        currentKeys = [];
        return;
      }

      // Build new key list and reuse existing nodes
      for (i; i < arr.length; i++) {
        const element = use(arr[i], i);
        const key = element && isHellaNode(element)
          ? element.props?.key ?? i
          : i;

        newKeys.push(key);

        let node = keyToNode.get(key);
        !node && (node = resolveNode(element, parent));
        newKeyToNode.set(key, node);
      }

      // Remove unused nodes
      for (const [key, node] of keyToNode)
        !newKeyToNode.has(key) && node.parentNode === parent && parent.removeChild(node);

      // Optimized reordering using LIS to minimize DOM operations
      if (currentKeys.length === 0) {
        // First render - just append all
        for (const key of newKeys)
          parent.appendChild(newKeyToNode.get(key)!);
      } else {
        // Check if we have any matching keys - if none match, do complete replacement
        if (newKeys.filter(key => keyToNode.has(key)).length === 0 && newKeys.length > 0) {
          // Complete replacement - clear and rebuild
          while (parent.firstChild)
            parent.removeChild(parent.firstChild);
          for (const key of newKeys)
            parent.appendChild(newKeyToNode.get(key)!);
        } else {
          // Create position mapping for partial updates
          const keyToOldIndex = new Map(),
            toMove = new Set(newKeys.map((_, i) => i));

          currentKeys.forEach((key, i) => keyToOldIndex.set(key, i));
          getLIS(newKeys.map(key => keyToOldIndex.get(key) ?? -1)).forEach((i: number) => toMove.delete(i));

          // Move only nodes that need moving (backwards to preserve order)
          let anchor: Node | null = null, i = newKeys.length - 1;

          for (i; i >= 0; i--) {
            const node = newKeyToNode.get(newKeys[i])!;
            toMove.has(i) && parent.insertBefore(node, anchor);
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

/**
 * Gets the Longest Increasing Subsequence of an array of numbers.
 * @param arr The array of numbers.
 * @returns The indices of the LIS.
 */
function getLIS(arr: number[]): number[] {
  let n = arr.length,
    tails: number[] = [],
    prevIndices = new Array(n).fill(-1),
    i = 0;

  if (n === 0) return [];

  for (i; i < n; i++) {
    if (arr[i] === -1) continue;

    let left = 0, right = tails.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      arr[tails[mid]] < arr[i] ? (left = mid + 1) : (right = mid);
    }

    left > 0 && (prevIndices[i] = tails[left - 1]);

    left === tails.length ? tails.push(i) : (tails[left] = i);
  }

  // Reconstruct LIS
  let lis: number[] = [],
    curr = tails[tails.length - 1];
  while (curr !== -1) {
    lis.unshift(curr);
    curr = prevIndices[curr];
  }
  return lis;
}