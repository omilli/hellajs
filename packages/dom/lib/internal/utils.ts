import { isFunction } from "./core";
import type { HellaNode, HellaElement } from "../types/nodes";

/**
 * @internal
 * Checks if a value is a HellaNode (virtual DOM element).
 * Hot-path discriminator: avoids the `isPlainObject` toString/proto cost.
 * HellaNodes are plain object literals produced by the babel plugin / template
 * parser; DOM Nodes (which expose `tagName`, not `tag`) and primitives are
 * rejected by the `tag` own-property check.
 * @param value The value to check
 * @returns True if the value is a HellaNode
 */
export function isHellaNode(value: unknown): value is HellaNode {
  return value !== null && typeof value === "object" && (value as HellaNode).tag !== undefined;
}

/**
 * @internal
 * Normalizes an already-resolved value for text rendering.
 * Converts false, null, and undefined to empty string. Assumes the caller has
 * already invoked any function/signal getter — use {@link resolveText} when the
 * input may still be a function.
 * @param value The resolved value to normalize
 * @returns The normalized string value
 */
export function toText(value: unknown): string {
  return value === false || value === null || value === undefined ? "" : `${value}`;
}

/**
 * @internal
 * Resolves a value (calling it if a function) and normalizes for text rendering.
 * Converts false, null, and undefined to empty string.
 * @param value The value to normalize (function or resolved value)
 * @returns The normalized string value
 */
export function resolveText(value: unknown): string {
  return toText(resolveValue(value));
}

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
  const isFalsyVal = value === false || value === null || value === undefined;
  if (key === "value" || key === "checked" || key === "selected" || key === "innerHTML") {
    (element as unknown as Record<string, unknown>)[key] = isFalsyVal ? "" : value;
    return;
  }
  if (isFalsyVal) {
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
