import type { HellaNode } from "./types";

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
 * Checks if a value is a HellaNode.
 * @param vNode The value to check.
 * @returns True if the value is a HellaNode.
 */
export function isHellaNode(vNode: unknown): vNode is HellaNode {
  return (vNode && typeof vNode === "object" && (vNode as HellaNode).tag) as boolean;
}

/**
 * Checks if a value is a DOM Node.
 * @param value The value to check.
 * @returns True if the value is a Node.
 */
export function isNode(value: unknown): value is Node {
  return (value && typeof value === 'object' && 'nodeType' in value) as boolean;
}

export function appendChild(parent: Node, child: Node) {
  parent.appendChild(child);
}