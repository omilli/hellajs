/**
 * Structural cache-key normalization — plain-object and array keys compare by
 * shape instead of reference identity at every cache and dedup boundary.
 */
import { isPlainObject, isObject, isNull } from "./core";

/** Sentinel prefix marking a structurally-hashed key; no realistic user string key starts with a NUL byte. */
const HASH_PREFIX = "\u0000";

/**
 * Serializes a container into a deterministic string tagged by container kind (`o{...}` / `a[...]`),
 * object keys sorted, array order preserved. Leaf forms never collide across types: strings are
 * JSON-quoted, bigints carry an `n` suffix, dates a `d` prefix.
 * @param value - Array or plain object to serialize
 * @returns The serialization, or null when a nested value (Map, Set, symbol, class instance,
 * function) has no stable form — the caller then falls back to reference identity
 */
function serialize(value: unknown): string | null {
  if (isNull(value)) return "null";
  switch (typeof value) {
    case "string": return JSON.stringify(value);
    case "number": return String(value);
    case "boolean": return String(value);
    case "bigint": return String(value) + "n";
    case "undefined": return "undefined";
  }
  if (value instanceof Date) return "d" + value.toISOString();
  if (Array.isArray(value)) {
    let out = "a[";
    let i = 0;
    const len = value.length;
    while (i < len) {
      if (i > 0) out += ",";
      const item = serialize(value[i]);
      if (isNull(item)) return null;
      out += item;
      i++;
    }
    return out + "]";
  }
  if (isPlainObject(value)) {
    if (Object.getOwnPropertySymbols(value).length > 0) return null;
    const keys = Object.keys(value).sort();
    let out = "o{";
    let i = 0;
    const len = keys.length;
    while (i < len) {
      if (i > 0) out += ",";
      const item = serialize(value[keys[i]!]);
      if (isNull(item)) return null;
      out += JSON.stringify(keys[i]) + ":" + item;
      i++;
    }
    return out + "}";
  }
  return null;
}

/**
 * @internal
 * Normalizes a resolved cache key for Map equality: arrays and plain objects become a
 * sentinel-prefixed deterministic string (nested dates as ISO strings, nested non-plain values
 * abort hashing), so structurally equal keys hit the same cache and dedup entries. Primitives
 * pass through unchanged — Map already compares them by value — and every other top-level shape
 * (dates, Map/Set, class instances, symbols) keeps reference identity.
 * @param key - The resolved cache key
 * @returns The key to hand to cache and dedup Maps
 */
export function stableKey(key: unknown): unknown {
  if (!isObject(key)) return key;
  if (!Array.isArray(key) && !isPlainObject(key)) return key;
  const serialized = serialize(key);
  return isNull(serialized) ? key : HASH_PREFIX + serialized;
}
