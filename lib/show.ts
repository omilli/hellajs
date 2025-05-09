import { effect, pushScope, popScope } from "./reactive";
import { cleanNodeRegistry } from "./registry";
import { isFunction, resolveNode } from "./mount";
import type { VNodeValue } from "./types";

export function show(
  when: boolean | (() => boolean),
  is: () => VNodeValue,
  not?: () => VNodeValue
): Node {
  let currentNode: Node | null = null;
  let cleanupSubtree: (() => void) | null = null;

  const placeholder = document.createComment("show");
  const fragment = document.createDocumentFragment();
  fragment.append(placeholder);

  effect(() => {
    const condition = isFunction(when) ? when() : when;

    if (currentNode && currentNode.parentNode) {
      cleanNodeRegistry(currentNode);
      currentNode.parentNode.replaceChild(placeholder, currentNode);
      currentNode = null;
    }

    if (cleanupSubtree) {
      cleanupSubtree();
      cleanupSubtree = null;
    }

    let node: Node | null = null;
    let registryCleanup: (() => void) | null = null;

    if (condition ? is : not) {
      pushScope({
        registerEffect: (cleanup: () => void) => {
          registryCleanup = cleanup;
        }
      });

      const value = condition ? is() : not?.();
      node = resolveNode(value);

      popScope();

      if (node && placeholder.parentNode) {
        placeholder.parentNode.replaceChild(node, placeholder);
        currentNode = node;
      }

      cleanupSubtree = () => {
        if (node) cleanNodeRegistry(node);
        if (registryCleanup) registryCleanup();
      };
    }
  });

  return fragment;
}