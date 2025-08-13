import { effect, type Signal } from "@hellajs/core";
import { resolveNode } from "./mount";
import type { ForEach, HellaElement } from "./types";
import { DOC, isFunction, isVNode } from "./utils";
import { templateManager, __hellaUtilOptimizedForEach } from "./template";

/**
 * Template-optimized forEach for pre-cached JSX templates
 * @template T
 * @param each The list of items to render.
 * @param templateId The template ID from Babel plugin.
 * @param paramNames Parameter names for template binding.
 * @param use The render function for each item (fallback).
 * @returns A function that renders the list to a parent element.
 */
export function forEachOptimized<T>(
  each: T[] | Signal<T[]> | (() => T[]),
  templateId: string,
  paramNames: string[],
  use: ForEach<T>
) {
  const fn = function (parent: HellaElement) {
    let keyToNode = new Map<unknown, Node>();
    let keyToTemplateBinding = new Map<unknown, any>();
    let currentKeys: unknown[] = [];
    const placeholder = DOC.createComment("forEach-optimized");

    effect(() => {
      const arr = isFunction(each) ? each() : each || [];

      if (arr.length === 0) {
        parent.textContent = "";
        parent.appendChild(placeholder);
        keyToNode.clear();
        keyToTemplateBinding.clear();
        currentKeys = [];
        return;
      }

      const newKeys: unknown[] = [];
      const newKeyToNode = new Map<unknown, Node>();
      const newKeyToTemplateBinding = new Map<unknown, any>();

      // Check if template is available for optimization
      const hasTemplate = templateManager.hasTemplate(templateId);

      // Build new key list and reuse existing nodes with template optimization
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        
        let element;
        let node;
        
        if (hasTemplate) {
          // Use template optimization
          const context = Object.fromEntries(
            paramNames.map((name, idx) => [
              name,
              idx === 0 ? item : idx === 1 ? i : undefined
            ]).filter(([, value]) => value !== undefined)
          );

          const cachedBinding = keyToTemplateBinding.get(i);
          if (cachedBinding && JSON.stringify(cachedBinding.context) === JSON.stringify(context)) {
            // Reuse existing template binding
            element = cachedBinding.element;
            node = keyToNode.get(i);
          } else {
            // Create new template binding
            element = templateManager.bindTemplate(templateId, context);
            if (element) {
              node = resolveNode(element, parent);
              newKeyToTemplateBinding.set(i, { context, element });
            }
          }
        }
        
        // Fallback to regular forEach behavior
        if (!element) {
          element = use(item, i);
          node = keyToNode.get(i) || resolveNode(element, parent);
        }

        const key = element && isVNode(element) ? element.props?.key ?? i : i;
        newKeys.push(key);
        if (node) {
          newKeyToNode.set(key, node);
        }
      }

      // Remove unused nodes
      for (const [key, node] of keyToNode) {
        if (!newKeyToNode.has(key) && node.parentNode === parent) {
          parent.removeChild(node);
        }
      }

      // Use the same efficient reordering logic as the original forEach
      if (currentKeys.length === 0) {
        // First render - just append all
        for (const key of newKeys) {
          const node = newKeyToNode.get(key);
          if (node) parent.appendChild(node);
        }
      } else {
        // Check if we have any matching keys
        const matchingKeysCount = newKeys.filter(key => keyToNode.has(key)).length;
        const shouldCompleteReplace = matchingKeysCount === 0 && newKeys.length > 0;

        if (shouldCompleteReplace) {
          // Complete replacement
          while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
          }
          for (const key of newKeys) {
            const node = newKeyToNode.get(key);
            if (node) parent.appendChild(node);
          }
        } else {
          // Optimized reordering with LIS
          const keyToOldIndex = new Map();
          currentKeys.forEach((key, i) => keyToOldIndex.set(key, i));

          const newToOldIndices = newKeys.map(key => keyToOldIndex.get(key) ?? -1);
          const lisIndices = getLIS(newToOldIndices);
          const toMove = new Set(newKeys.map((_, i) => i));
          lisIndices.forEach((i: number) => toMove.delete(i));

          // Move only nodes that need moving
          let anchor: Node | null = null;
          for (let i = newKeys.length - 1; i >= 0; i--) {
            const node = newKeyToNode.get(newKeys[i]);
            if (node && toMove.has(i)) {
              parent.insertBefore(node, anchor);
            }
            anchor = node || anchor;
          }
        }
      }
      
      keyToNode = newKeyToNode;
      keyToTemplateBinding = newKeyToTemplateBinding;
      currentKeys = newKeys;
    });
  };

  return fn;
}

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
  const fn = function (parent: HellaElement) {
    let keyToNode = new Map<unknown, Node>();
    let currentKeys: unknown[] = [];
    const placeholder = DOC.createComment("forEach");

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
          node = resolveNode(element, parent);
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
      } keyToNode = newKeyToNode;
      currentKeys = newKeys;
    });
  };

  return fn;
}

/**
 * Gets the Longest Increasing Subsequence of an array of numbers.
 * @param arr The array of numbers.
 * @returns The indices of the LIS.
 */
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