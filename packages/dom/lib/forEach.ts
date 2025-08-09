import { effect, type Signal } from "@hellajs/core";
import { resolveNode } from "./mount";
import type { ForEach } from "./types";
import { DOC, isFunction, isVNode } from "./utils";

export function forEach<T>(
  each: T[] | Signal<T[]> | (() => T[]),
  use: ForEach<T>
) {
  const fn = function (parent: Node) {
    let keyToNode = new Map<unknown, Node>();
    let currentKeys: unknown[] = [];
    const placeholder = DOC.createComment("forEach-placeholder");

    effect(() => {
      const arr = isFunction(each) ? each() : each || [];

      if (arr.length === 0) {
        parent.textContent = "";
        parent.appendChild(placeholder);
        keyToNode.clear();
        currentKeys = [];
        return;
      }

      const newKeys: unknown[] = [];
      const newKeyToNode = new Map<unknown, Node>();

      // Build new key list and reuse existing nodes
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        const element = use(item, i);
        const key = element && isVNode(element)
          ? element.props?.key ?? i
          : i;

        newKeys.push(key);

        let node = keyToNode.get(key);
        if (!node) {
          node = resolveNode(element);
        }
        newKeyToNode.set(key, node);
      }

      // Remove unused nodes
      for (const [key, node] of keyToNode) {
        if (!newKeyToNode.has(key) && node.parentNode === parent) {
          parent.removeChild(node);
        }
      }

      // Optimized reordering using LIS to minimize DOM operations
      if (currentKeys.length === 0) {
        // First render - just append all
        for (const key of newKeys) {
          parent.appendChild(newKeyToNode.get(key)!);
        }
      } else {
        // Check if we have any matching keys - if none match, do complete replacement
        const matchingKeysCount = newKeys.filter(key => keyToNode.has(key)).length;
        const shouldCompleteReplace = matchingKeysCount === 0 && newKeys.length > 0;
        
        if (shouldCompleteReplace) {
          // Complete replacement - clear and rebuild
          while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
          }
          for (const key of newKeys) {
            parent.appendChild(newKeyToNode.get(key)!);
          }
        } else {
          // Create position mapping for partial updates
          const keyToOldIndex = new Map();
          currentKeys.forEach((key, i) => keyToOldIndex.set(key, i));

          const newToOldIndices = newKeys.map(key => keyToOldIndex.get(key) ?? -1);
          const lisIndices = getLIS(newToOldIndices);
          const toMove = new Set(newKeys.map((_, i) => i));
          lisIndices.forEach((i: number) => toMove.delete(i));

          // Move only nodes that need moving (backwards to preserve order)
          let anchor: Node | null = null;
          for (let i = newKeys.length - 1; i >= 0; i--) {
            const node = newKeyToNode.get(newKeys[i])!;
            if (toMove.has(i)) {
              parent.insertBefore(node, anchor);
            }
            anchor = node;
          }
        }
      }      keyToNode = newKeyToNode;
      currentKeys = newKeys;
    });
  };

  (fn as unknown as { arity: boolean }).arity = true;
  return fn;
}

function getLIS(arr: number[]): number[] {
  const n = arr.length;
  if (n === 0) return [];

  const tails: number[] = [];
  const prevIndices = new Array(n).fill(-1);

  for (let i = 0; i < n; i++) {
    if (arr[i] === -1) continue;

    let left = 0, right = tails.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (arr[tails[mid]] < arr[i]) left = mid + 1;
      else right = mid;
    }

    if (left > 0) prevIndices[i] = tails[left - 1];

    if (left === tails.length) tails.push(i);
    else tails[left] = i;
  }

  // Reconstruct LIS
  const lis: number[] = [];
  let curr = tails[tails.length - 1];
  while (curr !== -1) {
    lis.unshift(curr);
    curr = prevIndices[curr];
  }
  return lis;
}