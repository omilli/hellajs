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

  // Check values directly without the redundant "in" check
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    // Direct property access is faster than using "in" operator
    if (a[key as keyof T] !== b[key as keyof T]) {
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
  // Early return if nodes are the same reference
  if (oldNode === newNode) return;

  // For text content updates, use direct textContent assignment
  if (oldNode.firstChild?.nodeType === Node.TEXT_NODE &&
    newNode.firstChild?.nodeType === Node.TEXT_NODE &&
    oldNode.childNodes.length === 1 && newNode.childNodes.length === 1) {
    if (oldNode.textContent !== newNode.textContent) {
      oldNode.textContent = newNode.textContent;
    }
    return;
  }

  // Fast-path for className (high-frequency update)
  if (oldNode.className !== newNode.className) {
    oldNode.className = newNode.className;
  }

  // Fast-path for common style updates
  if (oldNode.getAttribute('style') !== newNode.getAttribute('style')) {
    oldNode.setAttribute('style', newNode.getAttribute('style') || '');
  }

  // Quick check if attribute counts differ
  if (oldNode.attributes.length !== newNode.attributes.length) {
    // Full attribute sync
    for (let i = 0; i < newNode.attributes.length; i++) {
      const attr = newNode.attributes[i];
      if (attr.name !== 'class' && attr.name !== 'style') {
        oldNode.setAttribute(attr.name, attr.value);
      }
    }

    for (let i = oldNode.attributes.length - 1; i >= 0; i--) {
      const name = oldNode.attributes[i].name;
      if (name !== 'class' && name !== 'style' && !newNode.hasAttribute(name)) {
        oldNode.removeAttribute(name);
      }
    }
  } else {
    // Check each attribute individually
    for (let i = 0; i < newNode.attributes.length; i++) {
      const attr = newNode.attributes[i];
      if (attr.name !== 'class' && attr.name !== 'style' &&
        oldNode.getAttribute(attr.name) !== attr.value) {
        oldNode.setAttribute(attr.name, attr.value);
      }
    }
  }
}
