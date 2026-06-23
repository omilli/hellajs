import { isPlainObject } from "./internal/core";

/**
 * Deep clones an object, handling nested objects, arrays, and built-in types.
 * Correctly clones Date, RegExp, Map, and Set instances.
 * @internal
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => deepClone(item)) as T;
  if (obj instanceof Date) return new Date(obj.getTime()) as T;
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags) as T;
  if (obj instanceof Map) {
    const entries = Array.from(obj.entries());
    const cloned = new Map<unknown, unknown>();
    let mi = 0;
    const mLen = entries.length;
    while (mi < mLen) {
      const [key, value] = entries[mi]!;
      cloned.set(key, deepClone(value));
      mi++;
    }
    return cloned as T;
  }
  if (obj instanceof Set) {
    const values = Array.from(obj.values());
    const cloned = new Set<unknown>();
    let si = 0;
    const sLen = values.length;
    while (si < sLen) {
      cloned.add(deepClone(values[si]!));
      si++;
    }
    return cloned as T;
  }
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
      if (Array.isArray(origVal) && origVal.length === draftVal.length) {
        let eq = true;
        let j = 0;
        const jLen = origVal.length;
        while (j < jLen) {
          if (origVal[j] !== draftVal[j]) { eq = false; break; }
          j++;
        }
        if (!eq) { changes[key] = draftVal; }
      } else {
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


