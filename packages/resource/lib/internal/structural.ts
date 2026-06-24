/**
 * Reference-preserving deep comparison for structural sharing of fetch results.
 */
import { isPlainObject } from "./core";

/**
 * @internal
 * Returns prev when it is structurally equal to next, preserving references
 * for unchanged plain-object and array subtrees so dependent computeds skip
 * redundant re-evaluation. Primitives use Object.is; arrays and plain objects
 * recurse element- and key-wise; Map, Set, Date, and class instances use strict
 * equality and are never merged. When any subtree changes, a new container is
 * built along the changed path while sibling subtrees keep their prev references.
 * @template T
 * @param prev - The existing value, the reference source for unchanged subtrees
 * @param next - The newly produced value
 * @returns prev when structurally equal, otherwise a new structure sharing
 *   unchanged subtrees with prev; non-mergeable types return next
 */
export const structuralShare = <T>(prev: T | undefined, next: T): T => {
  if (prev === undefined) return next;
  if (Object.is(prev, next)) return prev;

  if (prev === null || next === null) return next;
  if (typeof prev !== "object" || typeof next !== "object") return next;

  if (Array.isArray(prev)) {
    if (!Array.isArray(next) || prev.length !== next.length) return next;
    const prevArr = prev as unknown as unknown[];
    const nextArr = next as unknown as unknown[];
    let changed = false;
    const len = prevArr.length;
    const result: unknown[] = new Array(len);
    let i = 0;
    while (i < len) {
      const shared = structuralShare(prevArr[i], nextArr[i]);
      if (shared !== prevArr[i]) changed = true;
      result[i] = shared;
      i++;
    }
    if (!changed) return prev;
    return result as T;
  }

  if (Array.isArray(next)) return next;
  if (!isPlainObject(prev) || !isPlainObject(next)) return next;

  const prevObj = prev as unknown as Record<string, unknown>;
  const nextObj = next as unknown as Record<string, unknown>;
  const prevKeys = Object.keys(prevObj);
  if (prevKeys.length !== Object.keys(nextObj).length) return next;

  const kLen = prevKeys.length;
  let sameKeys = true;
  let ki = 0;
  while (ki < kLen) {
    if (!Object.hasOwn(nextObj, prevKeys[ki]!)) {
      sameKeys = false;
      break;
    }
    ki++;
  }
  if (!sameKeys) return next;

  let changed = false;
  const result: Record<string, unknown> = {};
  let i = 0;
  while (i < kLen) {
    const key = prevKeys[i]!;
    const shared = structuralShare(prevObj[key], nextObj[key]);
    if (shared !== prevObj[key]) changed = true;
    result[key] = shared;
    i++;
  }
  if (!changed) return prev;
  return result as T;
};
