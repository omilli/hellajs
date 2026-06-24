import { isFunction, isPlainObject, isFalsy } from "./core";
import type { HellaNode, HellaElement } from "../types/nodes";

/**
 * @internal
 * Checks if a value is a HellaNode (virtual DOM element).
 * @param value The value to check
 * @returns True if the value is a HellaNode
 */
export function isHellaNode(value: unknown): value is HellaNode {
  return isPlainObject(value) && (value as HellaNode).tag !== undefined;
}

/**
 * @internal
 * Normalizes a value for text rendering.
 * Converts false, null, and undefined to empty string.
 * @param value The value to normalize
 * @returns The normalized string value
 */
export function resolveText(value: unknown): string {
  value = resolveValue(value);
  return isFalsy(value) ? "" : `${value}`;
}

const DIRECT_PROPS = Object.freeze(new Set(["value", "checked", "selected", "innerHTML"]));

/**
 * @internal
 * Renders a property/attribute to a DOM element.
 * Handles array values by joining with spaces (useful for CSS classes).
 * Removes attribute when value is false/null/undefined, sets empty string for true.
 * @param element The DOM element to set the property on
 * @param key The property/attribute key name
 * @param value The value to set
 */
export function renderProp(element: HellaElement, key: string, value: unknown) {
  if (DIRECT_PROPS.has(key)) {
    (element as unknown as Record<string, unknown>)[key] = isFalsy(value) ? "" : value;
    return;
  }
  if (isFalsy(value)) {
    element.removeAttribute(key);
    return;
  }
  if (Array.isArray(value)) {
    element.setAttribute(key, value.filter(Boolean).join(" "));
    return;
  }
  if (value === true) {
    element.setAttribute(key, "");
    return;
  }
  element.setAttribute(key, value as string);
}

/**
 * @internal
 * Resolves a value by executing it if it's a function, otherwise returns as-is.
 * @param value The value to resolve
 * @returns The resolved value
 */
export function resolveValue(value: unknown): unknown {
  return isFunction(value) ? value() : value;
}
