import { isHellaNode, resolveValue } from "./internal/utils";
import { registry } from "./registry";
import { resolveNode } from "./mount";
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

    // Reusable arrays - clear instead of allocate each render
    let newKeys: unknown[] = [];
    let newKeyToNode = new Map<unknown, Node>();
    let newKeyToItem = new Map<unknown, T>();
    const nodesToRemove: Node[] = [];

    // Create boundary markers to isolate forEach content from siblings
    const startMarker = document.createComment("forEach");
    const endMarker = document.createComment("forEach");
    parent.appendChild(startMarker);
    parent.appendChild(endMarker);

    registry.addEffect(parent, () => {
      // Use marker's parentNode to handle fragments correctly
      const actualParent = startMarker.parentNode as Element;
      if (!actualParent) return;

      // Resolve data source - function, signal, or static array
      const arr: T[] = resolveValue(each) as T[];

      if (arr.length > 0) {
        // Ultra fast path: First render - create and append directly
        if (currentKeys.length === 0) {
          const fragment = document.createDocumentFragment();
          const arrLen = arr.length;
          for (let index = 0; index < arrLen; index++) {
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
          }
          actualParent.insertBefore(fragment, endMarker);
          return;
        }

        // For subsequent renders, clear and reuse collections
        newKeys.length = 0;
        newKeyToNode.clear();
        newKeyToItem.clear();
        nodesToRemove.length = 0;

        const arrLen = arr.length;
        for (let index = 0; index < arrLen; index++) {
          const item = arr[index]!;
          const element = use(item, index);
          const key = element && isHellaNode(element)
            ? element.props?.key ?? (item as { id?: unknown })?.id ?? index
            : (item as { id?: unknown })?.id ?? index;

          newKeys.push(key);

          let node = keyToNode.get(key);
          const oldItem = keyToItem.get(key);
          // Resolve node if it doesn't exist OR if item reference changed
          !node || oldItem !== item ? (node = resolveNode(element)) : 0;
          newKeyToNode.set(key, node);
          newKeyToItem.set(key, item);
        }

        // Bulk cleanup: Collect nodes that are no longer needed or were replaced
        for (const [key, node] of keyToNode) {
          if (node.parentNode !== actualParent) continue;
          const newNode = newKeyToNode.get(key);
          // Remove if key no longer exists OR node was replaced (different instance)
          (!newNode || newNode !== node) && nodesToRemove.push(node);
        }

        // Remove nodes in bulk for better performance
        for (const node of nodesToRemove)
          actualParent.removeChild(node);

        // Fast path: Complete replacement when no keys match - use document fragment
        let hasMatchingKey = false;
        const newKeysLen = newKeys.length;
        for (let k = 0; k < newKeysLen; k++) {
          if (keyToNode.has(newKeys[k])) {
            hasMatchingKey = true;
            break;
          }
        }
        if (!hasMatchingKey && newKeysLen > 0) {
          // Clear content between markers - collect then remove for better performance
          const fragment = document.createDocumentFragment();
          for (const key of newKeys)
            fragment.appendChild(newKeyToNode.get(key)!);
          actualParent.insertBefore(fragment, endMarker);
        } else {
          // Complex path: Minimal DOM operations using Longest Increasing Subsequence
          // Create mapping from old positions to optimize reordering
          const keyToOldIndex = new Map<unknown, number>(),
            currentKeysLen = currentKeys.length,
            newKeysLen = newKeys.length,
            toMove = new Set<number>();
          for (let i = 0; i < newKeysLen; i++) toMove.add(i);

          for (let i = 0; i < currentKeysLen; i++)
            keyToOldIndex.set(currentKeys[i], i);

          // Map new keys to their old positions (-1 for new items or replaced items)
          const mapped = new Array(newKeysLen);
          for (let i = 0; i < newKeysLen; i++) {
            const key = newKeys[i];
            const oldNode = keyToNode.get(key);
            const newNode = newKeyToNode.get(key);
            // Treat as new if key didn't exist OR node was replaced
            mapped[i] = oldNode && oldNode === newNode ? (keyToOldIndex.get(key) ?? -1) : -1;
          }

          // Compute Longest Increasing Subsequence to find stable elements
          const n = mapped.length;
          const tails: number[] = [];
          const prevIndices = new Array(n).fill(-1);
          let keyIndexed = 0;

          if (n === 0) return [];

          // Patience sorting: tails[i] holds the index of the smallest tail element
          // for an increasing subsequence of length i+1
          for (; keyIndexed < n; keyIndexed++) {
            if (mapped[keyIndexed] === -1) continue;

            let left = 0, right = tails.length;

            // Binary search: find where mapped[keyIndexed] fits among tails
            while (left < right) {
              const mid = Math.floor((left + right) / 2);
              mapped[tails[mid]!] < mapped[keyIndexed] ? (left = mid + 1) : (right = mid);
            }

            // Track predecessor for path reconstruction
            left > 0 && (prevIndices[keyIndexed] = tails[left - 1]);

            // Extend or replace: grow LIS or improve an existing tail
            left === tails.length ? tails.push(keyIndexed) : (tails[left] = keyIndexed);
          }

          // Walk back through prevIndices to reconstruct the full LIS
          const lis: number[] = [];
          if (tails.length > 0) {
            let curr = tails[tails.length - 1]!;
            while (curr !== -1) {
              lis.unshift(curr);
              curr = prevIndices[curr]!;
            }
          }

          // Mark stable elements as not needing movement
          const lisLen = lis.length;
          for (let j = 0; j < lisLen; j++)
            toMove.delete(lis[j]!);

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
  }) as JSX.Element;

  fn.isDynamic = true;
  return fn;
}