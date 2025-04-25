import { isObject } from "../utils";
import { getItemId } from "./utils";

/**
 * Determines if two items are different based on their IDs
 * 
 * @param item1 - First item
 * @param item2 - Second item
 * @returns True if items are different, false otherwise
 */
export function isDifferentItem<T>(item1: T, item2: T): boolean {
  if (item1 === item2) return false;
  const id1 = getItemId(item1);
  const id2 = getItemId(item2);
  return id1 !== undefined && id2 !== undefined ? id1 !== id2 : true;
}

/**
 * Performs a shallow comparison of two objects
 * 
 * @param a - First object
 * @param b - Second object
 * @returns True if objects differ, false if identical
 */
export function shallowDiffers<T extends object>(a: T, b: T): boolean {
  if (a === b) return false;

  if (a == null || b == null || !isObject(a) || !isObject(b)) {
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  // Quick length check first
  if (keysA.length !== keysB.length) return true;

  // Check if object b has all keys from a with same values
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    const valueA = (a as Record<string, unknown>)[key];
    const valueB = (b as Record<string, unknown>)[key];

    // Key doesn't exist in b or values are different
    if (!(key in b) || valueA !== valueB) {
      return true;
    }
  }

  return false;
}

/**
 * Updates the content of an existing DOM node with content from a new one
 * 
 * @param oldNode - Existing node to update
 * @param newNode - New node with updated content
 */
export function updateNodeContent(oldNode: Element, newNode: Element): void {
  // For text content updates, use direct textContent assignment
  if (oldNode.firstChild?.nodeType === Node.TEXT_NODE &&
    newNode.firstChild?.nodeType === Node.TEXT_NODE &&
    oldNode.childNodes.length === 1 && newNode.childNodes.length === 1) {
    if (oldNode.textContent !== newNode.textContent) {
      oldNode.textContent = newNode.textContent;
    }
    return;
  }

  // Batch attribute updates
  const oldAttrs = Array.from(oldNode.attributes);
  const newAttrs = Array.from(newNode.attributes);

  // Remove attributes not in new node
  for (const attr of oldAttrs) {
    if (!newNode.hasAttribute(attr.name)) {
      oldNode.removeAttribute(attr.name);
    }
  }

  // Set attributes from new node
  for (const attr of newAttrs) {
    if (oldNode.getAttribute(attr.name) !== attr.value) {
      oldNode.setAttribute(attr.name, attr.value);
    }
  }

  // Direct assignment for className is faster
  if (oldNode.className !== newNode.className) {
    oldNode.className = newNode.className;
  }
}
