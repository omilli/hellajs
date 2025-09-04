import type { HellaNode } from "./types";

/** The global document object. */
export const DOC = document;

/**
 * Checks if a value is a string or a number.
 * @param vNode The value to check.
 * @returns True if the value is a string or number.
 */
export const isText = (vNode: unknown): vNode is string | number =>
  typeof vNode === "string" || typeof vNode === "number";

/**
 * Checks if a value is a function.
 * @param vNode The value to check.
 * @returns True if the value is a function.
 */
export const isFunction = (vNode: unknown): vNode is (...args: unknown[]) => unknown =>
  typeof vNode === "function";

/**
 * Checks if a value is a HellaNode.
 * @param vNode The value to check.
 * @returns True if the value is a HellaNode.
 */
export const isHellaNode = (vNode: unknown): vNode is HellaNode =>
  (vNode && typeof vNode === "object" && (vNode as HellaNode).tag) as boolean;

/**
 * Checks if a value is a DOM Node.
 * @param value The value to check.
 * @returns True if the value is a Node.
 */
export const isNode = (value: unknown): value is Node =>
  (value && typeof value === 'object' && 'nodeType' in value) as boolean;

export const appendChild = (parent: Node, child: Node) =>
  parent.appendChild(child);

export const insertBefore = (parent: Node, newNode: Node, referenceNode: Node | null) =>
  parent.insertBefore(newNode, referenceNode);

export const removeChild = (parent: Node, child: Node) =>
  parent.removeChild(child);

export const createElement = DOC.createElement.bind(DOC);
export const createTextNode = DOC.createTextNode.bind(DOC);
export const createComment = DOC.createComment.bind(DOC);
export const createDocumentFragment = DOC.createDocumentFragment.bind(DOC);

export const FRAG = "$";
export const EMPTY = "";
export const START = "start";
export const END = "end";
export const ON = "on";
export const ON_UPDATE = "onUpdate";
export const ON_DESTROY = "onDestroy";
export const FOR_EACH = "forEach";