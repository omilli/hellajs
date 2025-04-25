import { escapeHTML, isFlatVNode } from "./utils";
import type { EventFn, ReactiveElement, Signal, VNode, VNodeFlatFn } from "../types";
import { isFunction, isObject, isSignal, isVNodeString, kebabCase } from "../utils";
import { setupSignal } from "./reactive";
import { escapeAttribute, isStaticSubtree } from "./utils";
import { handleProps } from "./props";

/**
 * Creates a DOM element from a virtual node
 * @param vNode - Virtual node, string or number to create element from
 * @returns DOM node
 */
export function createElement(vNode: VNode | VNodeFlatFn, rootSelector: string): Node {
  // Fast path: string/number nodes
  if (isVNodeString(vNode)) return document.createTextNode(vNode as string);

  // Special case for signals passed directly - unwrap them
  if (isSignal(vNode)) {
    const textNode = document.createTextNode((vNode as Signal<unknown>)() as string);
    (vNode as Signal<unknown>).subscribe(value => textNode.textContent = value as string);
    return textNode;
  }

  // Handle VNodeFlatFn functions
  if (isFlatVNode(vNode)) {
    return createElement((vNode as VNodeFlatFn)(), rootSelector);
  }

  const { type, props, children = [] } = vNode as VNode;

  // Handle fragments (VNodes without a type property)
  if (!type) {
    const fragment = document.createDocumentFragment();
    const len = children.length;
    for (let i = 0; i < len; i++) {
      const child = children[i];
      if (child != null) {
        fragment.appendChild(createElement(child as VNode, rootSelector));
      }
    }
    return fragment;
  }

  // Optimization for static elements with many children
  if (isStaticSubtree(vNode as VNode) && shouldOptimize(vNode as VNode)) {
    return createElementWithTemplate(vNode as VNode);
  }

  // Create the element
  const element = document.createElement(type) as ReactiveElement;

  // Process props
  if (props) {
    processProps(element, props);
  }

  // Process children - with fast paths for common scenarios
  if (children.length === 0) {
    return element;
  } else if (children.length === 1) {
    return processSingleChild(element, children[0], rootSelector);
  } else {
    return processMultipleChildren(element, children, rootSelector);
  }
}

/**
 * Process a single child - optimized for the common case
 */
function processSingleChild(element: ReactiveElement, child: unknown, rootSelector: string): ReactiveElement {
  if (child == null) return element;

  if (isSignal(child)) {
    setupSignal(element, child as Signal<unknown>, "textContent");
    return element;
  }

  if (isFunction(child) && 'subscribe' in (child as any)) {
    const contentFn = child as unknown as Signal<unknown>;
    element.textContent = contentFn() as string;
    element._cleanup = contentFn.subscribe(value => {
      element.textContent = value as string;
    });
    return element;
  }

  if (isFlatVNode(child)) {
    element.appendChild(createElement((child as VNodeFlatFn)(), rootSelector));
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
      if (isFlatVNode(child)) {
        fragment.appendChild(createElement((child as VNodeFlatFn)(), rootSelector));
      } else {
        fragment.appendChild(
          isObject(child) || isFunction(child)
            ? createElement(child as VNode, rootSelector)
            : document.createTextNode(child)
        );
      }
    }
  }

  element.appendChild(fragment);
  return element;
}

/**
 * Process element properties efficiently
 */
function processProps(element: ReactiveElement, props: Record<string, any>): void {
  for (const key in props) {
    const value = props[key];

    // Skip key prop (used only for reconciliation)
    if (key === "key") continue;

    // Fast path for event handlers
    if (key.startsWith("on") && isFunction(value)) {
      element.addEventListener(key.slice(2).toLowerCase(), value as EventFn);
      continue;
    }

    // Handle signals
    if (isSignal(value)) {
      setupSignal(element, value as Signal<unknown>, key);
      continue;
    }

    // Handle computed/derived signals
    if (isFunction(value) && 'subscribe' in value) {
      const attrFn = value as Signal<unknown>;
      handleProps(element, key, attrFn() as string);

      const cleanup = attrFn.subscribe((newValue) => {
        handleProps(element, key, newValue as string);
      });

      element._cleanups = [...(element._cleanups || []), cleanup];
      continue;
    }

    // Regular values
    handleProps(element, key, value);
  }
}

/**
 * Creates an element using template strings for improved performance
 * This is a significant optimization for large static subtrees
 */
function createElementWithTemplate(vNode: VNode): Node {
  const html = buildTemplateString(vNode);
  const template = document.createElement('template');
  template.innerHTML = html;

  // For single children, return the node directly
  if (template.content.childNodes.length === 1) {
    return template.content.firstChild!;
  }

  // Otherwise return the entire fragment
  return template.content;
}

/**
 * Builds an HTML string from a static VNode tree
 */
function buildTemplateString(vNode: VNode): string {
  if (isVNodeString(vNode)) {
    return escapeHTML(vNode as string);
  }

  const { type, props = {}, children = [] } = vNode;

  if (!type) {
    // Fragment
    return children.map(child => buildTemplateString(child as VNode)).join('');
  }

  // Build attributes string
  const attrs: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on')) continue; // Skip event handlers

    const attrName = key === 'className' ? 'class' :
      key === 'htmlFor' ? 'for' : key;

    if (key === 'style' && isObject(value)) {
      const styleStr = Object.entries(value as Record<string, string>)
        .map(([prop, val]) => `${kebabCase(prop)}: ${val}`)
        .join('; ');

      attrs.push(`${attrName}="${escapeAttribute(styleStr)}"`);
    } else if (value !== false && value !== null && value !== undefined) {
      attrs.push(`${attrName}="${escapeAttribute(value as string)}"`);
    }
  }

  const childrenHTML = children
    .filter(child => child != null)
    .map(child => buildTemplateString(child as VNode))
    .join('');

  return `<${type}${attrs.length ? ' ' + attrs.join(' ') : ''}>${childrenHTML}</${type}>`;
}

/**
 * Determines if a VNode tree should be optimized with templates
 * Only worth it for larger trees
 */
function shouldOptimize(vNode: VNode): boolean {
  const threshold = 10; // Minimum node count to trigger optimization
  return countNodes(vNode) >= threshold;
}

/**
 * Counts nodes in a VNode tree
 */
function countNodes(vNode: VNode): number {
  if (!vNode || isVNodeString(vNode)) return 1;

  const { children = [] } = vNode;
  let count = 1; // Count self

  for (const child of children) {
    if (child == null) continue;
    if (isObject(child)) {
      count += countNodes(child as VNode);
    } else {
      count += 1;
    }
  }

  return count;
}