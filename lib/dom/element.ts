import type { EventFn, ReactiveElement, Signal, VNode } from "../types";
import { isFunction, isObject, isSignal, isVNodeString } from "../utils";
import { setupSignal } from "./reactive";

// Map property names to their DOM attribute equivalents
export const PROP_MAP: Record<string, string> = {
  className: "class",
  htmlFor: "for",
};

/**
 * Creates a DOM element from a virtual node
 * @param vNode - Virtual node, string or number to create element from
 * @returns DOM node
 */
export function createElement(vNode: VNode): Node {
  if (isVNodeString(vNode)) return document.createTextNode(vNode as string);

  // Special case for signals passed directly - unwrap them
  if (isSignal(vNode)) {
    // Create a text node with the signal's current value
    const textNode = document.createTextNode((vNode as Signal<unknown>)() as string);
    // Set up subscription to update the text node
    (vNode as Signal<unknown>).subscribe(value => textNode.textContent = value as string);
    return textNode;
  }

  const { type, props, children = [] } = vNode;

  const element = document.createElement(type as string) as ReactiveElement;

  if (props) {
    for (const key in props) {
      const value = props[key];

      if (isFunction(value)) {
        if (key.startsWith("on")) {
          element.addEventListener(key.slice(2).toLowerCase(), value as EventFn);
        } else {
          // Create effect to update attribute
          const attrFn = value as Signal<unknown>;
          // Set initial value
          const initialValue = attrFn();
          handleProps(element, key, initialValue);
          // Setup effect for updates
          const cleanup = attrFn.subscribe(() => {
            const newValue = attrFn();
            handleProps(element, key, newValue);
          });
          // Store cleanup function
          element._cleanups = [...(element._cleanups || []), cleanup];
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
    if (isSignal(children[0])) {
      setupSignal(element, (children[0] as Signal<unknown>), "textContent");
      return element;
    }

    // Handle function that returns content (for reactive content)
    if (isFunction(children[0])) {
      const contentFn = children[0] as Signal<unknown>;
      // Set initial value
      element.textContent = contentFn() as string;
      // Create effect to update content
      const cleanup = contentFn.subscribe(() => element.textContent = contentFn() as string);
      // Store cleanup function for later
      element._cleanup = cleanup;
      return element;
    }

    const fragment = document.createDocumentFragment();

    for (const child of children) {
      if (child != null) {
        fragment.appendChild(
          isObject(child) || isFunction(child)
            ? createElement(child as VNode)
            : document.createTextNode(String(child))
        );
      }
    }

    element.appendChild(fragment);
  }

  return element;
}

/**
 * Sets a property on an HTML element in a type-safe way
 * 
 * @param element - The element to set the property on
 * @param key - The property name
 * @param value - The property value
 */
export function setElementProperty<T extends HTMLElement>(element: T, key: string, value: unknown): void {
  if (key in element) {
    // Use type assertion with proper constraints
    (element as unknown as Record<string, unknown>)[key] = value;
  } else {
    // Fallback to setAttribute if direct property setting fails
    element.setAttribute(key, String(value));
  }
}


/**
 * Handles setting properties on an element
 * 
 * @param element - The element to set the property on
 * @param key - The property name
 * @param value - The property value
 */
export function handleProps<T extends HTMLElement>(element: T, key: string, value: unknown): void {
  if (key === 'textContent' || key === 'className' || key === 'id') {
    setElementProperty(element, key, value);
  } else if (key === 'style' && isObject(value)) {
    Object.assign(element.style, value as Partial<CSSStyleDeclaration>);
  } else {
    try {
      setElementProperty(element, key, value);
    } catch {
      element.setAttribute(PROP_MAP[key] || key, String(value));
    }
  }

  if (key === "dataset" && isObject(value)) {
    for (const dataKey in value) {
      const dataVal = (value as Record<string, unknown>)[dataKey];
      isSignal(dataVal)
        ? setupSignal(element, dataVal as Signal<unknown>, `data-${dataKey}`)
        : (element.dataset[dataKey] = String(dataVal));
    }
  }
}