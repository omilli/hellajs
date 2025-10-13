import type { HellaNode, HellaElement } from "./types";

/** The global document object. */
export const DOC = document;

/**
 * Checks if a value is a string or a number (text content).
 * Used to determine if a value can be rendered as text content in the DOM.
 * @param hellaNode The value to check.
 * @returns True if the value is a string or number.
 */
export const isText = (hellaNode: unknown): hellaNode is string | number =>
  typeof hellaNode === "string" || typeof hellaNode === "number";

/**
 * Checks if a value is a function.
 * Used to identify reactive bindings and component functions in the template system.
 * @param hellaNode The value to check.
 * @returns True if the value is a function.
 */
export const isFunction = (hellaNode: unknown): hellaNode is (...args: unknown[]) => unknown =>
  typeof hellaNode === "function";

/**
 * Checks if a value is a HellaNode (virtual DOM element).
 * HellaNodes are objects with a `tag` property representing virtual DOM elements.
 * @param hellaNode The value to check.
 * @returns True if the value is a HellaNode.
 */
export const isHellaNode = (hellaNode: unknown): hellaNode is HellaNode =>
  (hellaNode && typeof hellaNode === "object" && (hellaNode as HellaNode).tag) as boolean;

/**
 * Checks if a value is a DOM Node.
 * Used to identify actual DOM elements vs virtual elements in the rendering pipeline.
 * @param value The value to check.
 * @returns True if the value is a DOM Node.
 */
export const isNode = (value: unknown): value is Node =>
  (value && typeof value === 'object' && 'nodeType' in value) as boolean;

/**
 * Appends a child node to a parent node.
 * Optimized wrapper around DOM's appendChild for better performance.
 * @param parent The parent node to append to.
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

/** Property name for forEach rendering. */
export const FOR_EACH = "forEach";

/**
 * Renders a property/attribute to a DOM element.
 * Handles array values by joining them with spaces (useful for CSS classes).
 * @param element The DOM element to set the property on.
 * @param key The property/attribute key name.
 * @param value The value to set (string, number, boolean, or array).
 */
export const renderProp = (element: HellaElement, key: string, value: unknown) =>
  !key.startsWith(ON) && key !== "children" && element.setAttribute(key, Array.isArray(value) ? value.filter(Boolean).join(" ") : value as string);