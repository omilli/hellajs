import type { HellaNode, HellaElement } from "../types";

/**
 * Checks if a value is a function.
 * @param hellaNode The value to check
 * @returns True if the value is a function
 */
export const isFunction = (hellaNode: unknown): hellaNode is (...args: unknown[]) => unknown =>
  typeof hellaNode === "function";

/**
 * Checks if a value is a HellaNode (virtual DOM element).
 * @param hellaNode The value to check
 * @returns True if the value is a HellaNode
 */
export const isHellaNode = (hellaNode: unknown): hellaNode is HellaNode =>
  (hellaNode && typeof hellaNode === "object" && (hellaNode as HellaNode).tag) as boolean;

/**
 * Checks if a value is a DOM Node.
 * @param value The value to check
 * @returns True if the value is a DOM Node
 */
export const isNode = (value: unknown): value is Node =>
  (value && typeof value === 'object' && 'nodeType' in value) as boolean;

/**
 * Normalizes a value for text rendering.
 * Converts false, null, and undefined to empty string to prevent rendering as "false", "null", "undefined".
 * @param value The value to normalize
 * @returns The normalized string value
 */
export const normalizeTextValue = (value: unknown): string =>
  value === false || value == null ? "" : `${value}`;

/**
 * Renders a property/attribute to a DOM element.
 * Handles array values by joining with spaces (useful for CSS classes).
 * Removes attribute when value is false/null/undefined, sets empty string for true.
 * @param element The DOM element to set the property on
 * @param key The property/attribute key name
 * @param value The value to set (string, number, boolean, or array)
 */
export const renderProp = (element: HellaElement, key: string, value: unknown) => {
  value === false || value == null
    ? element.removeAttribute(key)
    : element.setAttribute(key, Array.isArray(value)
      ? value.filter(Boolean).join(" ")
      : value !== true
        ? value as string
        : "");
};

/**
 * Resolves a value by executing it if it's a function, otherwise returns as-is.
 * @param value The value to resolve
 * @returns The resolved value
 */
export const resolveValue = (value: unknown): unknown => isFunction(value) ? value() : value;

/**
 * Efficiently iterates over object entries with cached length.
 * @param obj The object to iterate over
 * @param callback The callback to execute for each key-value pair
 */
export const objectLoop = <T extends Record<string, unknown>>(
  obj: T | undefined,
  callback: (key: string, value: unknown) => void
) => {
  if (!obj) return;

  let entries = Object.entries(obj),
    index = 0, length = entries.length;

  for (; index < length; index++) {
    const [key, value] = entries[index];
    callback(key, value);
  }
};