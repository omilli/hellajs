import type { EventFn, ReactiveElement, Signal, VNode, VNodeFlatFn } from "../types";
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
export function createElement(vNode: VNode | VNodeFlatFn): Node {
  // Handle VNodeFlatFn functions

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

    // Handle function that returns 
    // content (for reactive content)
    if (isFunction(children[0])) {
      // Check if it's a VNodeFlatFn
      if ((children[0] as VNodeFlatFn)._flatten === true) {
        const childNode = createElement((children[0] as VNodeFlatFn)());
        element.appendChild(childNode);
        return element;
      }

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
        // Handle VNodeFlatFn in children
        if (isFunction(child) && (child as VNodeFlatFn)._flatten === true) {
          const childNode = createElement((child as VNodeFlatFn)());
          fragment.appendChild(childNode);
        } else {
          fragment.appendChild(
            isObject(child) || isFunction(child)
              ? createElement(child as VNode)
              : document.createTextNode(String(child))
          );
        }
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
  // Skip setting properties with null, undefined or false values
  if (checkNullish(element, key, value)) return;

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
  // Skip rendering attributes with null, undefined or false values
  if (checkNullish(element, key, value)) return;

  if (key === 'textContent' || key === 'className' || key === 'id') {
    setElementProperty(element, key, value);
  } else if (key === 'style' && isObject(value)) {
    Object.assign(element.style, value as Partial<CSSStyleDeclaration>);
  } else if (key === "dataset") {
    // Handle dataset specially - unwrap if it's a signal first
    const datasetValue = isSignal(value) ? (value as Signal<unknown>)() : value;

    if (isObject(datasetValue)) {
      for (const dataKey in datasetValue) {
        const dataVal = (datasetValue as Record<string, unknown>)[dataKey];
        // Skip null/undefined/false dataset values
        if (dataVal === null || dataVal === undefined || dataVal === false) {
          // Remove the data attribute if it exists
          if (dataKey in element.dataset) {
            delete element.dataset[dataKey];
          }
          continue;
        }

        if (isSignal(dataVal)) {
          // If individual dataset value is a signal, set up reactive updates
          setupSignal(element, dataVal as Signal<unknown>, `data-${dataKey}`);
        } else {
          // Direct assignment to dataset property
          element.dataset[dataKey] = String(dataVal);
        }
      }
    }
  } else {
    try {
      setElementProperty(element, key, value);
    } catch {
      element.setAttribute(PROP_MAP[key] || key, String(value));
    }
  }
}

/**
 * Checks if a value should be considered nullish or empty and thus not rendered as an attribute
 * 
 * @param element - The element being processed
 * @param key - The property/attribute name
 * @param value - The property/attribute value
 * @returns true if the attribute should be skipped/removed, false if it should be set
 */
function checkNullish(element: ReactiveElement, key: string, value: unknown): boolean {
  // Skip null, undefined, and false values
  if (value === null || value === undefined || value === false) {
    // Handle boolean attributes specifically
    if (key.toLowerCase() in element && typeof element[key.toLowerCase() as keyof ReactiveElement] === 'boolean') {
      element.removeAttribute(key);
    } else if (element.hasAttribute(key)) {
      element.removeAttribute(key);
    }
    return true;
  }

  // Handle empty strings for specific attributes that shouldn't render when empty
  if (value === '' && ['className', 'id', 'style', 'href', 'src', 'alt'].includes(key)) {
    if (element.hasAttribute(PROP_MAP[key] || key)) {
      element.removeAttribute(PROP_MAP[key] || key);
    }
    return true;
  }

  return false;
}