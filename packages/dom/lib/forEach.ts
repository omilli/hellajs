import { addRegistryEffect, type Signal, deepEqual, isFunction, isHellaNode } from "./internal";
import { resolveNode } from "./mount";
import type { ForEach } from "./types";

/**
 * Efficiently renders and updates a list of items using keyed reconciliation.
 * Uses LIS algorithm to minimize DOM moves and multiple fast paths for optimal performance.
 * @template T
 * @param each List of items (static array, signal, or function)
 * @param use Render function for each item, receives item and index
 * @returns Function that mounts the list into a parent element
 */
export function forEach<T>(
  each: T[] | Signal<T[]> | (() => T[]),
  use: ForEach<T>
) {
  const fn = (parent: Element) => {
    let keyToNode = new Map<unknown, Node>(),
      keyToItem = new Map<unknown, T>(),
      currentKeys: unknown[] = [];

    // Reusable arrays - clear instead of allocate each render
    let newKeys: unknown[] = [],
      newKeyToNode = new Map<unknown, Node>(),
      newKeyToItem = new Map<unknown, T>(),
      nodesToRemove: Node[] = [];

    // Create boundary markers to isolate forEach content from siblings
    const startMarker = document.createComment("forEach");
    const endMarker = document.createComment("forEach");
    parent.appendChild(startMarker);
    parent.appendChild(endMarker);

    addRegistryEffect(parent, () => {
      // Use marker's parentNode to handle fragments correctly
      const actualParent = startMarker.parentNode as Element;
      if (!actualParent) return;

      // Resolve data source - function, signal, or static array
      let arr: T[] = isFunction(each) ? each() : each as [] || [];

      if (arr.length > 0) {
        // Ultra fast path: First render - create and append directly
        if (currentKeys.length === 0) {
          const fragment = document.createDocumentFragment();
          for (let index = 0; index < arr.length; index++) {
            const item = arr[index];
            const element = use(item, index);
            const key = element && isHellaNode(element)
              ? element.props?.key ?? index
              : index;
            const node = resolveNode(element);
            fragment.appendChild(node);
            keyToNode.set(key, node);
            keyToItem.set(key, item);
            currentKeys.push(key);
          }
          actualParent.insertBefore(fragment, endMarker);
          return;
        }

        // For subsequent renders, clear and reuse collections
        newKeys.length = 0;
        newKeyToNode.clear();
        newKeyToItem.clear();
        nodesToRemove.length = 0;

        for (let index = 0; index < arr.length; index++) {
          const item = arr[index];
          const element = use(item, index);
          const key = element && isHellaNode(element)
            ? element.props?.key ?? index
            : index;

          newKeys.push(key);

          let node = keyToNode.get(key);
          const oldItem = keyToItem.get(key);
          // Resolve node if it doesn't exist OR if item data changed
          !node || !deepEqual(oldItem, item) ? (node = resolveNode(element)) : 0;
          newKeyToNode.set(key, node);
          newKeyToItem.set(key, item);
        }

        // Bulk cleanup: Collect and batch remove nodes that are no longer needed
        for (const [key, node] of keyToNode)
          !newKeyToNode.has(key) && node.parentNode === actualParent &&
            nodesToRemove.push(node);

        // Also remove nodes that were replaced (different reference for same key)
        for (const [key, oldNode] of keyToNode) {
          const newNode = newKeyToNode.get(key);
          newNode && newNode !== oldNode && oldNode.parentNode === actualParent &&
            nodesToRemove.push(oldNode);
        }

        // Remove nodes in bulk for better performance
        for (const node of nodesToRemove)
          actualParent.removeChild(node);

        // Fast path: Same length and keys match - check for simple reorder or item changes
        let hasAnyChanges = false;
        if (currentKeys.length === newKeys.length) {
          let i = 0, len = currentKeys.length;
          for (; i < len; i++) {
            const key = currentKeys[i];
            // Check if key position changed OR if node was replaced
            if (key !== newKeys[i] || keyToNode.get(key) !== newKeyToNode.get(key)) {
              hasAnyChanges = true;
              break;
            }
          }
          // Ultra fast path: Array is identical, no DOM changes needed
          if (!hasAnyChanges) {
            keyToNode = newKeyToNode;
            keyToItem = newKeyToItem;
            currentKeys = newKeys;
            return;
          }
        }

        // Fast path: Complete replacement when no keys match - use document fragment
        let hasMatchingKey = false;
        for (let k = 0, klen = newKeys.length; k < klen; k++) {
          if (keyToNode.has(newKeys[k])) {
            hasMatchingKey = true;
            break;
          }
        }
        if (!hasMatchingKey && newKeys.length > 0) {
          // Clear content between markers - batch collect then remove for better performance
          const toRemove: Node[] = [];
          let currentNode = startMarker.nextSibling;
          while (currentNode !== endMarker) {
            toRemove.push(currentNode!);
            currentNode = currentNode!.nextSibling;
          }
          for (let i = 0, len = toRemove.length; i < len; i++)
            actualParent.removeChild(toRemove[i]);

          const fragment = document.createDocumentFragment();
          for (const key of newKeys)
            fragment.appendChild(newKeyToNode.get(key)!);
          actualParent.insertBefore(fragment, endMarker);
        } else {
          // Complex path: Minimal DOM operations using Longest Increasing Subsequence
          // Create mapping from old positions to optimize reordering
          const keyToOldIndex = new Map(),
            toMove = new Set(newKeys.map((_, i) => i));

          for (let i = 0; i < currentKeys.length; i++)
            keyToOldIndex.set(currentKeys[i], i);

          // Map new keys to their old positions (-1 for new items or replaced items)
          const newKeysLen = newKeys.length;
          const mapped = new Array(newKeysLen);
          for (let i = 0; i < newKeysLen; i++) {
            const key = newKeys[i];
            const oldNode = keyToNode.get(key);
            const newNode = newKeyToNode.get(key);
            // Treat as new if key didn't exist OR node was replaced
            mapped[i] = oldNode && oldNode === newNode ? (keyToOldIndex.get(key) ?? -1) : -1;
          }

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
          let lis: number[] = [];
          if (tails.length > 0) {
            let curr = tails[tails.length - 1];
            while (curr !== -1) {
              lis.unshift(curr);
              curr = prevIndices[curr];
            }
          }

          // Mark stable elements as not needing movement
          const lisLen = lis.length;
          for (let j = 0; j < lisLen; j++)
            toMove.delete(lis[j]);

          // Reorder: Move only elements that need repositioning (backwards to maintain order)
          // Start anchor at endMarker to ensure all nodes stay within boundaries
          let anchor: Node | null = endMarker, i = newKeys.length - 1;

          for (i; i >= 0; i--) {
            const node = newKeyToNode.get(newKeys[i])!;
            toMove.has(i) && actualParent.insertBefore(node, anchor);
            anchor = node;
          }
        }

        // Update state for next render cycle - swap references and reuse
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
      // Fast path: Clear list when empty
      else {
        // Clear content between markers, preserving siblings
        let currentNode = startMarker.nextSibling;
        while (currentNode !== endMarker) {
          const next = currentNode!.nextSibling;
          actualParent.removeChild(currentNode!);
          currentNode = next;
        }

        keyToNode.clear();
        keyToItem.clear();
        currentKeys.length = 0;
      }
    });
  };

  fn.isForEach = true;
  return fn;
}