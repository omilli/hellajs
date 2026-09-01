import { isPlainObject, isObject } from "./core";

/**
 * @internal
 * Deep clones an object, handling nested objects, arrays, and built-in types.
 * Correctly clones Date, RegExp, Map, and Set instances; class instances keep
 * their prototype.
 */
export function deepClone<T>(obj: T): T {
  if (!isObject(obj)) return obj;
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
  const clone = Object.create(Object.getPrototypeOf(obj)) as T;
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
 * @internal
 * Structural equality: built-ins (Date, RegExp, Map, Set) and objects compare
 * by content, everything else by reference. Inputs are deepClone output of a
 * store snapshot — a tree, so no cycle guard is needed.
 */
export function structurallyEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!isObject(a) || !isObject(b)) return false;

  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof RegExp && b instanceof RegExp) return a.source === b.source && a.flags === b.flags;

  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    const entries = Array.from(a.entries());
    let mi = 0;
    while (mi < entries.length) {
      const [key, value] = entries[mi]!;
      if (!b.has(key) || !structurallyEqual(value, b.get(key))) return false;
      mi++;
    }
    return true;
  }

  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    const members = Array.from(a);
    let si = 0;
    while (si < members.length) {
      const member = members[si]!;
      if (b.has(member)) { si++; continue; }
      let matched = false;
      const remaining = Array.from(b);
      let ri = 0;
      while (ri < remaining.length) {
        if (structurallyEqual(member, remaining[ri]!)) { matched = true; break; }
        ri++;
      }
      if (!matched) return false;
      si++;
    }
    return true;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    let ai = 0;
    while (ai < a.length) {
      if (!structurallyEqual(a[ai], b[ai])) return false;
      ai++;
    }
    return true;
  }

  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  let ki = 0;
  while (ki < aKeys.length) {
    const key = aKeys[ki]!;
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!structurallyEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
    ki++;
  }
  return true;
}

/**
 * @internal
 * Extracts only the changed properties between original and draft.
 * Recursively builds partial objects for nested changes.
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

    if (isPlainObject(draftVal)) {
      if (!isPlainObject(origVal)) {
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
    } else if (!structurallyEqual(origVal, draftVal)) {
      changes[key] = draftVal;
    }

    i++;
  }

  return changes;
}
