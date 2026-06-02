/**
 * Checks if a value is a function.
 * @param value The value to check
 * @returns True if the value is a function
 */
export const isFunction = (value: unknown): value is (...args: unknown[]) => unknown =>
  typeof value === "function";

/**
 * Checks if a value is a string.
 * @param value The value to check
 * @returns True if the value is a string
 */
export const isString = (value: unknown): value is string =>
  typeof value === "string";

/**
 * Checks if a value is undefined.
 * @param value The value to check
 * @returns True if the value is undefined
 */
export const isUndefined = (value: unknown): value is undefined =>
  typeof value === "undefined";

/**
 * Checks if a value is a plain object (not null, not array, not class instance).
 * Validates prototype chain to exclude class instances.
 * @param value The value to check
 * @returns True if the value is a plain object
 */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object") return false;

  const proto = Object.getPrototypeOf(value) as typeof Object.prototype | null;

  const hasObjectPrototype =
    proto === null ||
    proto === Object.prototype ||
    Object.getPrototypeOf(proto) === null; // Cross-realm support

  if (!hasObjectPrototype) return false;

  return Object.prototype.toString.call(value) === "[object Object]";
};

/**
 * Checks if a value is falsy (false, null, or undefined).
 * @param value The value to check
 * @returns True if the value is false, null, or undefined
 */
export const isFalsy = (value: unknown): value is false | null | undefined =>
  value === false || value === null || isUndefined(value);

/**
 * Iterate object keys with optimal performance.
 * @param obj Object to iterate
 * @param callback Function called for each key-value pair
 */
export const objectLoop = <T extends Record<string, unknown>>(
  obj: T | undefined,
  callback: (key: string, value: unknown) => void
) => {
  if (!obj) return;
  const keys = Object.keys(obj);
  const len = keys.length;
  for (let i = 0; i < len; i++) {
    const key = keys[i];
    callback(key, obj[key]);
  }
};
