import { isObject } from "./internal/core";

/**
 * Stringifies an object for hashing.
 * @param obj The object to stringify
 * @returns A string representation of the object
 */
export function stringify(obj: unknown): string {
  if (!isObject(obj)) return String(obj);

  const keys = Object.keys(obj).sort();
  const pairs = [];
  let i = 0;
  const len = keys.length;
  while (i < len) {
    pairs.push(`${keys[i]}:${stringify((obj as Record<string, unknown>)[keys[i] as string])}`);
    i++;
  }
  return `{${pairs.join(',')}}`;
}

/**
 * Computes a DJB2 hash from a string.
 * @param str The string to hash
 * @returns A base36 hash string
 */
export function hash(str: string): string {
  let h = 5381;
  let i = str.length;
  while (i) h = (h * 33) ^ str.charCodeAt(--i);
  return (h >>> 0).toString(36);
}