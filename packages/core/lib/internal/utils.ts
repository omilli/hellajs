/**
 * Checks if a value is a function.
 * @param value The value to check
 * @returns True if the value is a function
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

/**
 * Checks if two values are equal under the default equality: identical references,
 * with NaN equal to itself so repeated NaN writes never count as changes.
 * @param a First value
 * @param b Second value
 * @returns True if the values are equal
 */
export function isEqual(a: unknown, b: unknown): boolean {
  return a === b || (a !== a && b !== b);
}

/**
 * Checks if a value is a string.
 * @param value The value to check
 * @returns True if the value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Checks if a value is undefined.
 * @param value The value to check
 * @returns True if the value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return typeof value === "undefined";
}

/**
 * Checks if a value is a plain object (not null, not array, not class instance).
 * Validates prototype chain to exclude class instances.
 * @param value The value to check
 * @returns True if the value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;

  const proto = Object.getPrototypeOf(value) as typeof Object.prototype | null;

  const hasObjectPrototype =
    proto === null ||
    proto === Object.prototype ||
    Object.getPrototypeOf(proto) === null; // Cross-realm support

  if (!hasObjectPrototype) return false;

  return Object.prototype.toString.call(value) === "[object Object]";
}

/**
 * Checks if a value is falsy (false, null, or undefined).
 * @param value The value to check
 * @returns True if the value is false, null, or undefined
 */
export function isFalsy(value: unknown): value is false | null | undefined {
  return value === false || value === null || isUndefined(value);
}

/**
 * Checks if a value is an object (not null).
 * @param value The value to check
 * @returns True if the value is an object
 */
export function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

/**
 * Iterate object keys with optimal performance.
 * @param obj Object to iterate
 * @param callback Function called for each key-value pair
 */
export function objectLoop<T extends Record<string, unknown>>(
  obj: T | undefined,
  callback: (key: string, value: unknown) => void
) {
  if (!obj) return;
  const keys = Object.keys(obj);
  let i = 0;
  const len = keys.length;
  while (i < len) {
    const key = keys[i] as string;
    callback(key, obj[key]);
    i++;
  }
};
