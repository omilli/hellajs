import type { VNodeString, WithId } from "../types";
import { isObject } from "../utils";

/**
 * Gets the ID property from an item if it exists
 * 
 * @param item - Item to extract ID from
 * @returns The ID value or undefined
 */
export function getItemId<T>(item: T): VNodeString | undefined {
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
export function getRootElement(rootSelector: string): HTMLElement {
  // Get the root element
  const rootElement = document.querySelector(rootSelector);
  // Throw if root element not found
  if (!rootElement) {
    console.warn(`No element found for selector: ${rootSelector}`);
  }
  return rootElement as HTMLElement;
}