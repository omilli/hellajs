/**
 * Checks if a value is a function.
 * @param value The value to check
 * @returns True if the value is a function
 * @example
 * isFunction(() => {}); // true
 * isFunction(async () => {}); // true
 * isFunction(function* () {}); // true
 * isFunction(class {}); // true
 */
export const isFunction = (value: unknown): value is (...args: unknown[]) => unknown =>
  typeof value === "function";

/**
 * Checks if a value is a string.
 * @param value The value to check
 * @returns True if the value is a string
 * @example
 * isString("hello"); // true
 * isString(123); // false
 */
export const isString = (value: unknown): value is string =>
  typeof value === "string";

/**
 * Checks if a value is undefined.
 * @param value The value to check
 * @returns True if the value is undefined
 * @example
 * isUndefined(undefined); // true
 * isUndefined(null); // false
 */
export const isUndefined = (value: unknown): value is undefined =>
  typeof value === "undefined";

/**
 * Checks if a value is a plain object (not null, not array, not class instance).
 * Validates prototype chain to exclude class instances.
 * @param value The value to check
 * @returns True if the value is a plain object
 * @example
 * isPlainObject({}); // true
 * isPlainObject({ key: "value" }); // true
 * isPlainObject(Object.create(null)); // true
 * isPlainObject(null); // false
 * isPlainObject([]); // false
 * isPlainObject(new Date()); // false
 * isPlainObject(new (class Cls {})()); // false
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
 * Iterate object keys with optimal performance.
 * @param obj Object to iterate
 * @param callback Function called for each key-value pair
 * @example
 * objectLoop({ a: 1, b: 2 }, (key, value) => console.log(key, value));
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