import type { ReactiveElement, VNode, VNodeFlatFn } from "./types";
import { createElement, getRootElement } from "./dom";
import { isFunction, isObject } from "./utils";
/**
 * Simple render function that mounts multiple VNodes to a DOM element
 * 
 * @param rootSelector - CSS selector for the container element
 * @param vNodes - The virtual DOM nodes to render
 * @returns Array of created DOM nodes
 */
export function render(rootSelector: string, ...vNodes: (VNode | VNodeFlatFn)[]): Node[] {
  // Process all VNodes to flatten list functions in the tree
  // Fast paths and optimization flags
  const hasNoVNodes = vNodes.length === 0;
  if (hasNoVNodes) return [];

  // Process each top-level VNode with the rootSelector
  vNodes = vNodes.map(vNode => processVNode(vNode, rootSelector));


  const rootElement = getRootElement(rootSelector);
  const elements: Node[] = [];

  for (const vNode of vNodes) {
    const element = createElement(vNode);
    rootElement.appendChild(element);
    elements.push(element);
  }

  return elements;
}

export function cleanup(node: ChildNode): void {
  // Remove event listeners and subscriptions
  if (node instanceof HTMLElement) {
    (node as ReactiveElement)._cleanup?.();

    if ((node as ReactiveElement)._cleanups) {
      for (const cleanupFn of (node as ReactiveElement)._cleanups || []) {
        cleanupFn();
      }
    }
  }

  // Recursively clean up child nodes
  node.childNodes.forEach(cleanup);
}

/**
 * 
 * @param vNode - VNode - The virtual DOM node to process
 * @param rootSelector - CSS selector for the container element
 * Recursive function to flatten list objects and add rootSelector prop
 * 
 * @returns {VNode} - The processed VNode
 */
function processVNode(vNode: VNode | VNodeFlatFn, rootSel: string): VNode {
  // Fast path: primitive values don't need processing
  if (!isObject(vNode) && !isFunction(vNode)) return vNode;

  // Handle list functions
  if (isFunction(vNode) && (vNode as any)._flatten) {
    return processVNode((vNode as () => VNode)(), rootSel);
  }

  // Set rootSelector for actual VNode objects
  if (isObject(vNode)) {
    vNode.rootSelector = rootSel;

    // Only process children if they exist (fast path)
    if (vNode.children && Array.isArray(vNode.children) && vNode.children.length > 0) {
      // Avoid recreating arrays if possible
      let hasListFunctions = false;
      for (let i = 0; i < vNode.children.length; i++) {
        if (isFunction(vNode.children[i]) && ((vNode.children[i]) as VNodeFlatFn)._flatten) {
          hasListFunctions = true;
          break;
        }
      }

      if (hasListFunctions) {
        vNode.children = vNode.children.flatMap(child => {
          if (isFunction(child) && (child as VNodeFlatFn)._flatten) {
            const result = (child as () => VNode | VNode[])();
            return Array.isArray(result)
              ? result.map(r => processVNode(r, rootSel))
              : processVNode(result, rootSel);
          } else if (isObject(child)) {
            return processVNode(child as VNode, rootSel);
          }
          return child;
        });
      } else {
        // Fast path when no list functions
        for (let i = 0; i < vNode.children.length; i++) {
          if (isObject(vNode.children[i])) {
            vNode.children[i] = processVNode(vNode.children[i] as VNode, rootSel);
          }
        }
      }
    }
  }

  return vNode as VNode;
};