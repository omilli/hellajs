import type { ReactiveElement, VNode, VNodeFlatFn, VNodeString, VNodeValue, WithId } from "../types";
import { isBoolean, isFunction, isObject, isSignal } from "../utils";
import { PROP_MAP } from "./props";

/**
 * Gets the ID property from an item if it exists
 * 
 * @param item - Item to extract ID from
 * @returns The ID value or undefined
 */
export function getItemId<T>(
  item: T
): VNodeString | undefined {
  return item && isObject(item) && "id" in (item as object)
    ? ((item as unknown) as WithId).id
    : undefined;
}


/**
 * Retrieves a DOM element using the provided CSS selector.
 *
 * @param rootSelector - CSS selector string to identify the target DOM element
 * @returns The DOM element that matches the specified selector
 * @throws Error When the selector is not a string or when no matching element is found
 */
export function getRootElement(
  rootSelector?: string
): HTMLElement {
  // Get the root element
  const rootElement = document.querySelector(rootSelector as string);
  // Throw if root element not found
  if (!rootElement) {
    console.warn(`No element found for selector: ${rootSelector}`);
  }
  return rootElement as HTMLElement;
}

export function isFlatVNode(vNode: VNodeValue): vNode is VNodeFlatFn {
  return isFunction(vNode) && (vNode as VNodeFlatFn)._flatten === true
}


/**
 * Checks if a value should be considered nullish or empty and thus not rendered as an attribute
 * 
 * @param element - The element being processed
 * @param key - The property/attribute name
 * @param value - The property/attribute value
 * @returns true if the attribute should be skipped/removed, false if it should be set
 */
export function checkNullish(
  element: ReactiveElement,
  key: string,
  value: unknown
): boolean {
  // Skip null, undefined, and false values
  if (value === null || value === undefined || value === false) {
    // Handle boolean attributes specifically
    if (key.toLowerCase() in element && isBoolean(element[key.toLowerCase() as keyof ReactiveElement])) {
      element.removeAttribute(key);
    } else if (element.hasAttribute(key)) {
      element.removeAttribute(key);
    }

    // Special handling for class
    if (key === 'class') {
      element.className = '';
      element.removeAttribute('class');
    }

    return true;
  }

  // Handle empty strings for specific attributes that shouldn't render when empty
  if (value === '' && ['class', 'id', 'style', 'href', 'src', 'alt'].includes(key)) {
    if (key === 'class') {
      element.className = '';
      element.removeAttribute('class');
    } else if (element.hasAttribute(PROP_MAP[key] || key)) {
      element.removeAttribute(PROP_MAP[key] || key);
    }
    return true;
  }

  return false;
}