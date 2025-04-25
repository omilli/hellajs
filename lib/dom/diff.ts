import { isObject } from "../utils";
import { getItemId } from "./utils";

/**
 * Determines if two items are different based on their IDs
 * 
 * @param item1 - First item
 * @param item2 - Second item
 * @returns True if items are different, false otherwise
 */
export function isDifferentItem<T>(
  item1: T,
  item2: T
): boolean {
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
export function shallowDiffers<T extends object>(
  a: T,
  b: T
): boolean {
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
