import { isPlainObject } from "./internal/core";

/**
 * Deep clones an object, handling nested objects and arrays.
 * Does NOT clone built-ins like Date, Map, Set, RegExp — they pass through by reference.
 * @internal
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => deepClone(item)) as T;
  const clone = {} as T;
  const keys = Object.keys(obj as Record<string, unknown>);
  let i = 0;
  const len = keys.length;
  while (i < len) {
    const key = keys[i]!;
    (clone as Record<string, unknown>)[key] = deepClone((obj as Record<string, unknown>)[key]);
    i++;
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

  const keys = Object.keys(draft);
  let i = 0;
  const len = keys.length;
  while (i < len) {
    const key = keys[i]! as keyof T;

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

    i++;
  }

  return changes;
}

/**
 * Reference-equality check for arrays element-by-element.
 * Objects inside arrays must be replaced (not mutated) to register as changed.
 */
function arrayEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const len = a.length;
  let i = 0;
  while (i < len) {
    if (a[i]! !== b[i]!) return false;
    i++;
  }
  return true;
}
