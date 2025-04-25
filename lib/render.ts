import type { ReactiveElement, VNode, VNodeFlatFn, VNodeProps } from "./types";
import { createElement, getRootElement, isFlatVNode } from "./dom";
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
 * @param parentProps - Optional properties from the parent node
 * Recursive function to flatten list objects and add rootSelector prop
 * 
 * @returns {VNode} - The processed VNode
 */
function processVNode(vNode: VNode | VNodeFlatFn, rootSel: string, parentProps?: VNodeProps<any>): VNode {
  // Fast path: primitive values don't need processing
  if (!isObject(vNode) && !isFunction(vNode)) return vNode;

  // Set rootSelector for actual VNode objects
  if (isObject(vNode)) {
    vNode.rootSelector = rootSel;

    // Set parent props if provided
    if (parentProps) {
      vNode.parentProps = parentProps;
    }

    // Current node's props will be passed down as parent props to children
    const currentProps = vNode.props || {};

    // Only process children if they exist (fast path)
    if (vNode.children && Array.isArray(vNode.children) && vNode.children.length > 0) {
      // Avoid recreating arrays if possible
      let hasListFunctions = false;
      for (let i = 0; i < vNode.children.length; i++) {
        if (isFlatVNode(vNode.children[i])) {
          hasListFunctions = true;
          break;
        }
      }

      if (hasListFunctions) {
        vNode.children = vNode.children.flatMap(child => {
          if (isFlatVNode(child)) {
            const listFn = child as VNodeFlatFn;
            // Set parent ID on the list function
            if (currentProps.id) {
              listFn._parent = currentProps.id as string;
            }

            const result = listFn();
            return Array.isArray(result)
              ? result.map(r => processVNode(r, rootSel, currentProps))
              : processVNode(result, rootSel, currentProps);
          } else if (isObject(child)) {
            return processVNode(child as VNode, rootSel, currentProps);
          }
          return child;
        });
      } else {
        // Fast path when no list functions
        for (let i = 0; i < vNode.children.length; i++) {
          if (isObject(vNode.children[i])) {
            vNode.children[i] = processVNode(vNode.children[i] as VNode, rootSel, currentProps);
          }
        }
      }
    }
  }

  return vNode as VNode;
};