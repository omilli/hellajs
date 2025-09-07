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

/**
 * Appends a child node to a parent node.
 * @param parent The parent node.
 * @param child The child node to append.
 * @returns The appended child node.
 */
export const appendChild = (parent: Node, child: Node) =>
  parent.appendChild(child);

/**
 * Inserts a new node before a reference node as a child of a parent node.
 * @param parent The parent node.
 * @param newNode The new node to insert.
 * @param referenceNode The reference node before which to insert.
 * @returns The inserted node.
 */
export const insertBefore = (parent: Node, newNode: Node, referenceNode: Node | null) =>
  parent.insertBefore(newNode, referenceNode);

/**
 * Removes a child node from a parent node.
 * @param parent The parent node.
 * @param child The child node to remove.
 * @returns The removed child node.
 */
export const removeChild = (parent: Node, child: Node) =>
  parent.removeChild(child);

/** Creates an HTML element with the specified tag name. */
export const createElement = DOC.createElement.bind(DOC);

/** Creates a text node with the specified data. */
export const createTextNode = DOC.createTextNode.bind(DOC);

/** Creates a comment node with the specified data. */
export const createComment = DOC.createComment.bind(DOC);

/** Creates a new empty DocumentFragment. */
export const createDocumentFragment = DOC.createDocumentFragment.bind(DOC);

/** Fragment identifier for virtual nodes. */
export const FRAGMENT = "$";

/** Empty string constant. */
export const EMPTY = "";

/** Start marker for list boundaries. */
export const START = "start";

/** End marker for list boundaries. */
export const END = "end";

/** Prefix for event handler properties. */
export const ON = "on";

/** Property name for update lifecycle hook. */
export const ON_UPDATE = "onUpdate";

/** Property name for destroy lifecycle hook. */
export const ON_DESTROY = "onDestroy";

/** Property name for forEach rendering. */
export const FOR_EACH = "forEach";