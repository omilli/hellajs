import { isObject } from "./internal/core";

/**
 * @internal
 * Stringifies an object for hashing.
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
 * @internal
 * Computes a DJB2 hash from a string.
 */
export function hash(str: string): string {
  let h = 5381;
  let i = str.length;
  while (i) h = (h * 33) ^ str.charCodeAt(--i);
  return (h >>> 0).toString(36);
}