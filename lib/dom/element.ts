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
  console.log(`createElement`, rootSelector);
  // Handle VNodeFlatFn functions
  if (isFlatVNode(vNode)) {
    return createElement((vNode as VNodeFlatFn)(), rootSelector);
  }

  if (isVNodeString(vNode)) return document.createTextNode(vNode as string);

  // Special case for signals passed directly - unwrap them
  if (isSignal(vNode)) {
    // Create a text node with the signal's current value
    const textNode = document.createTextNode((vNode as Signal<unknown>)() as string);
    // Set up subscription to update the text node
    (vNode as Signal<unknown>).subscribe(value => textNode.textContent = value as string);
    return textNode;
  }

  const { type, props, children = [] } = vNode as VNode;

  // Handle fragments (VNodes without a type property)
  if (!type) {
    const fragment = document.createDocumentFragment();

    for (const child of children) {
      if (child != null) {
        fragment.appendChild(
          isObject(child) || isFunction(child)
            ? createElement(child as VNode, rootSelector)
            : document.createTextNode(String(child))
        );
      }
    }

    return fragment;
  }

  // Optimization for static elements with many children
  if (isStaticSubtree(vNode as VNode) && shouldOptimize(vNode as VNode)) {
    return createElementWithTemplate(vNode as VNode);
  }

  // Continue with existing approach for dynamic elements
  const element = document.createElement(type as string) as ReactiveElement;

  if (props) {
    for (const key in props) {
      const value = props[key];

      // Better detection of signal functions
      if (isFunction(value)) {
        if (key.startsWith("on")) {
          element.addEventListener(key.slice(2).toLowerCase(), value as EventFn);
        } else {
          // Try to check if signal has subscribe method
          if (isSignal(value)) {
            setupSignal(element, value as Signal<unknown>, key);
          } else {
            // Handle non-signal functions (including event handlers)
            const attrFn = value as Signal<unknown>;
            const initialValue = attrFn();
            handleProps(element, key, initialValue);

            // Setup reactive effect manually
            const cleanup = attrFn.subscribe((newValue) => {
              handleProps(element, key, newValue);
            });

            element._cleanups = [...(element._cleanups || []), cleanup];
          }
        }
        continue;
      }

      if (isSignal(value)) {
        setupSignal(element, value as Signal<unknown>, key);
        continue;
      }

      // Fast path for common properties
      handleProps(element, key, value);
    }
  }

  if (children.length > 0) {
    // Optimization: Use fragment for multiple children
    const fragment = children.length > 1 ? document.createDocumentFragment() : null;

    if (isSignal(children[0])) {
      setupSignal(element, (children[0] as Signal<unknown>), "textContent");
      return element;
    }

    if (isFlatVNode(children[0])) {
      const childNode = createElement((children[0] as VNodeFlatFn)(), rootSelector);
      element.appendChild(childNode);
      return element;
    }

    // Handle function that returns content (for reactive content)
    if (isFunction(children[0])) {
      const contentFn = children[0] as unknown as Signal<unknown>;
      // Set initial value
      element.textContent = contentFn() as string;
      // Create effect to update content
      const cleanup = contentFn.subscribe(() => element.textContent = contentFn() as string);
      // Store cleanup function for later
      element._cleanup = cleanup;
      return element;
    }

    for (const child of children) {
      if (child != null) {
        // Handle VNodeFlatFn in children
        if (isFlatVNode(child)) {
          const childNode = createElement((child as VNodeFlatFn)(), rootSelector);
          fragment ? fragment.appendChild(childNode) : element.appendChild(childNode);
        } else {
          const childNode = isObject(child) || isFunction(child)
            ? createElement(child as VNode, rootSelector)
            : document.createTextNode(String(child));

          fragment ? fragment.appendChild(childNode) : element.appendChild(childNode);
        }
      }
    }

    if (fragment) {
      element.appendChild(fragment);
    }
  }

  return element;
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
    return escapeHTML(String(vNode));
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
      attrs.push(`${attrName}="${escapeAttribute(String(value))}"`);
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