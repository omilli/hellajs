import { isFlatVNode } from "./utils";
import type { ReactiveElement, VNode, VNodeValue } from "../types";
import { isFunction, isObject, isSignal, isVNodeString } from "../utils";
import { setupSignal } from "./reactive";
import { processProps } from "./props";

/**
 * Creates a DOM element from a virtual node
 * @param vNode - Virtual node, string or number to create element from
 * @returns DOM node
 */
export function createElement(vNode: VNodeValue, rootSelector: string): Node {
  // Fast path: string/number nodes
  if (isVNodeString(vNode)) return document.createTextNode(vNode);

  // Special case for signals passed directly - unwrap them
  if (isSignal(vNode)) {
    const textNode = document.createTextNode(vNode() as string);
    vNode.subscribe(value => textNode.textContent = value as string);
    return textNode;
  }

  // Handle VNodeFlatFn functions
  if (isFlatVNode(vNode)) {
    return createElement(vNode(), rootSelector);
  }

  const { type, props, children = [] } = vNode as VNode;

  // Handle fragments (VNodes without a type property)
  if (!type) {
    const fragment = document.createDocumentFragment();
    const len = children.length;
    for (let i = 0; i < len; i++) {
      const child = children[i];
      if (child != null) {
        fragment.appendChild(createElement(child, rootSelector));
      }
    }
    return fragment;
  }

  // Create the element
  const element = document.createElement(type);

  // Process props
  if (props) {
    processProps(element, props);
  }

  // Process children - with fast paths for common scenarios
  if (children.length === 0) {
    return element;
  } else if (children.length === 1) {
    const child = children[0];
    if (child == null) return element;
    if (isSignal(child)) {
      setupSignal(element, child, "textContent");
      return element;
    }
    return processSingleChild(element, child, rootSelector);
  } else {
    return processMultipleChildren(element, children, rootSelector);
  }
}

/**
 * Process a single child - optimized for the common case
 */
function processSingleChild(element: ReactiveElement | DocumentFragment, child: VNodeValue, rootSelector: string): ReactiveElement | DocumentFragment {
  if (isFlatVNode(child)) {
    element.appendChild(createElement(child(), rootSelector));
  } else {
    element.appendChild(
      isObject(child) || isFunction(child)
        ? createElement(child as VNode, rootSelector)
        : document.createTextNode(child as string)
    );
  }

  return element;
}

/**
 * Process multiple children efficiently
 */
function processMultipleChildren(element: ReactiveElement, children: any[], rootSelector: string): ReactiveElement {
  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();

  for (const child of children) {
    if (child != null) {
      processSingleChild(fragment, child, rootSelector);
    }
  }

  element.appendChild(fragment);
  return element;
}