import type { Context, RenderedElement, VNode, VNodeValue } from "../types";
import { castToString, isVNodeString } from "../utils";
import { processAttributes } from "./attributes";
import { renderFragment } from "./fragment";

/**
 * Renders a hierarchical node (VNode) or primitive value into a DOM element.
 *
 * This function converts virtual DOM nodes into actual DOM elements. It handles
 * different types of nodes:
 * - Strings and numbers are converted to text nodes
 * - VNodes without a type are treated as fragments
 * - VNodes with a type are converted to HTML elements with their respective properties,
 *   event handlers, and children
 *
 * @param vNode - The node to render, can be an VNode object or a primitive (string/number)
 * @param rootSelector - CSS selector string identifying the root container
 * @param context - Application context for rendering
 * @returns The created DOM element, text node, or document fragment
 */
export function renderElement(
	vNode: VNodeValue,
	rootSelector: string,
	context: Context,
): RenderedElement {
	// Return text node for valid text vNodes
	if (isVNodeString(vNode)) {
		const textNode = document.createTextNode(castToString(vNode));
		(textNode as RenderedElement)._vnode = vNode;
		return textNode;
	}
	// vNode should be a VNode object at this point
	const { type, children = [] } = vNode as VNode;
	// Handle fragments  (when type is undefined or null)
	if (!type) {
		return renderFragment(children, rootSelector, context);
	}
	// Create the element dfrom the vNode type
	const element = document.createElement(type);
	(element as RenderedElement)._vnode = vNode;
	// Updafe the element attributes
	processAttributes(element, vNode as VNode, rootSelector);
	// Count the number of child nodes
	const childLen = children.length;
	// Loop through the children
	for (let i = 0; i < childLen; i++) {
		// Append the renderedElement to the element
		element.appendChild(renderElement(children[i], rootSelector, context));
	}
	return element;
}
