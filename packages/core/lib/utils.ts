/**
 * Type guard to check if a value is a Set instance.
 * @param val The value to check.
 * @returns True if val is a Set.
 */
const isSet = (val: unknown): val is Set<unknown> => val instanceof Set;

/**
 * Type guard to check if a value is a Map instance.
 * @param val The value to check.
 * @returns True if val is a Map.
 */
const isMap = (val: unknown): val is Map<unknown, unknown> => val instanceof Map;


/**
 * Performs deep equality comparison between two values.
 * Handles primitives, arrays, objects, Maps, and Sets recursively.
 * @param a First value to compare.
 * @param b Second value to compare.
 * @returns True if values are deeply equal.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  // Fast path: identical references or values
  if (a === b) return true;

  const A = typeof a;
  // All primitives except objects are compared by reference above
  if (
    A === 'string' ||
    A === 'number' ||
    A === 'boolean' ||
    A === 'undefined' ||
    A === 'symbol' ||
    A === 'bigint'
  ) return false;

  // Handle null separately since typeof null === 'object'
  if (a === null) return b === null;

  // If b is not an object or is null, they can't be equal
  if (typeof b !== 'object' || b === null) return false;

  // Handle arrays recursively
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    // Compare each element deeply
    for (let i = 0; i < a.length; i++)
      if (!deepEqual(a[i], b[i])) return false;
    return true;
  }

  // If a is not array but b is, they're different
  if (Array.isArray(b)) return false;

  // Different constructors means different types
  if ((a as object).constructor !== (b as object).constructor) return false;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  // Different number of keys means different objects
  if (keysA.length !== keysB.length) return false;

  // Compare each key-value pair recursively
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual((a as any)[key], (b as any)[key])) return false;
  }

  // Handle Map collections
  if (isMap(a)) {
    if (!isMap(b) || a.size !== b.size) return false;
    // Compare each map entry deeply
    for (const [key, value] of a)
      if (!b.has(key) || !deepEqual(value, b.get(key))) return false;
    return true;
  }

  // Handle Set collections
  if (isSet(a)) {
    if (!isSet(b) || a.size !== b.size) return false;
    // Check that all values exist in both sets
    for (const value of a)
      if (!b.has(value)) return false;
    return true;
  }

  return true;
}