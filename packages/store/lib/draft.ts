import { isPlainObject } from "./internal/core";

/**
 * Deep clones an object, handling nested objects and arrays.
 * Does NOT clone built-ins like Date, Map, Set, RegExp — they pass through by reference.
 * @internal
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as T;
  const clone = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  return clone;
}

/**
 * Extracts only the changed properties between original and draft.
 * Recursively builds partial objects for nested changes.
 * @internal
 */
export function extractChanges<T extends Record<string, unknown>>(
  original: T,
  draft: T
): Partial<T> {
  const changes: Partial<T> = {};

  for (const key in draft) {
    if (!Object.prototype.hasOwnProperty.call(draft, key)) continue;

    const origVal = original[key];
    const draftVal = draft[key];

    if (Array.isArray(draftVal)) {
      if (!Array.isArray(origVal) || !arrayEqual(origVal, draftVal)) {
        changes[key] = draftVal;
      }
    } else if (isPlainObject(draftVal) && draftVal !== null) {
      if (!isPlainObject(origVal) || origVal === null) {
        changes[key] = draftVal;
      } else {
        const nestedChanges = extractChanges(
          origVal as Record<string, unknown>,
          draftVal as Record<string, unknown>
        );
        if (Object.keys(nestedChanges).length > 0) {
          changes[key] = nestedChanges as T[Extract<keyof T, string>];
        }
      }
    } else {
      if (origVal !== draftVal) {
        changes[key] = draftVal;
      }
    }
  }

  return changes;
}

/**
 * Reference-equality check for arrays element-by-element.
 * Objects inside arrays must be replaced (not mutated) to register as changed.
 * @internal
 */
function arrayEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
