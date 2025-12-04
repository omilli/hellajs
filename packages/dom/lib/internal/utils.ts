import { isFunction, isPlainObject, isFalsy } from "./core";
import type { HellaNode, HellaElement } from "../types/nodes.d.ts";

/**
 * Checks if a value is a HellaNode (virtual DOM element).
 * @param hellaNode The value to check
 * @returns True if the value is a HellaNode
 */
export const isHellaNode = (hellaNode: unknown): hellaNode is HellaNode =>
  isPlainObject(hellaNode) && (hellaNode as HellaNode).tag !== undefined;
/**
 * Normalizes a value for text rendering.
 * Converts false, null, and undefined to empty string to prevent rendering as "false", "null", "undefined".
 * @param value The value to normalize
 * @returns The normalized string value
 */
export const resolveText = (value: unknown): string => {
  value = resolveValue(value);
  return isFalsy(value) ? "" : `${value}`;
}
/**
 * Renders a property/attribute to a DOM element.
 * Handles array values by joining with spaces (useful for CSS classes).
 * Removes attribute when value is false/null/undefined, sets empty string for true.
 * @param element The DOM element to set the property on
 * @param key The property/attribute key name
 * @param value The value to set (string, number, boolean, or array)
 */
export const renderProp = (element: HellaElement, key: string, value: unknown) => {
  isFalsy(value)
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