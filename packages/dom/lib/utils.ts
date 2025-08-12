import type { VNode } from "./types";

/** The global document object. */
export const DOC = document;

/**
 * Checks if a value is a string or a number.
 * @param vNode The value to check.
 * @returns True if the value is a string or number.
 */
export function isText(vNode: unknown): vNode is string | number {
  return typeof vNode === "string" || typeof vNode === "number";
}

/**
 * Checks if a value is a function.
 * @param vNode The value to check.
 * @returns True if the value is a function.
 */
export function isFunction(vNode: unknown): vNode is (...args: unknown[]) => unknown {
  return typeof vNode === "function";
}

/**
 * Checks if a value is a VNode.
 * @param vNode The value to check.
 * @returns True if the value is a VNode.
 */
export function isVNode(vNode: unknown): vNode is VNode {
  return (vNode && typeof vNode === "object" && (vNode as VNode).tag) as boolean;
}

/**
 * Checks if a value is a DocumentFragment.
 * @param value The value to check.
 * @returns True if the value is a DocumentFragment.
 */
export function isFragment(value: unknown): value is DocumentFragment {
  return value instanceof DocumentFragment;
}

/**
 * Checks if a value is a DOM Node.
 * @param value The value to check.
 * @returns True if the value is a Node.
 */
export function isNode(value: unknown): value is Node {
  return value instanceof Node;
}
