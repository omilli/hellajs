import type { Context, RenderedElement, VNode, VNodeValue } from "../types";
import { castToString, isVNodeString } from "../utils";
import { processAttributes } from "./attributes";
import { diffChildren } from "./children";
import { renderElement } from "./element";
import { renderFragment } from "./fragment";

/**
 * Compares and reconciles a real DOM node with a virtual node (VNode) representation.
 * This is the core diffing function that handles different node types and updates the DOM efficiently.
 *
 * @param domNode - The existing DOM node to be updated
 * @param vNode - The virtual node representation to reconcile with
 * @param parentElement - The parent element in the DOM tree where replacements would occur if necessary
 * @param rootSelector - CSS selector string identifying the root element
 * @param context - Current context with scoped state and handlers
 *
 * @returns The updated DOM node (which might be a new node if replacement occurred)
 *
 * @remarks
 * The function handles three main cases:
 * 1. Text nodes (when vNode is a string or number)
 * 2. Fragment nodes (when vNode.type is undefined or null)
 * 3. Regular HTML elements
 *
 * If the node types don't match, the old DOM node is replaced with a new one.
 */
export function diffNode(
	domNode: RenderedElement,
	vNode: VNodeValue,
	parentElement: Element | DocumentFragment,
	rootSelector: string,
	context: Context,
): RenderedElement {
	// Fast path: if virtual node reference is the same, skip diffing entirely
	if (domNode._vnode === vNode) return domNode;

	const nodeType = domNode.nodeType;

	// Handle text nodes - using Node.TEXT_NODE (3) for performance
	if (isVNodeString(vNode)) {
		const text = castToString(vNode);

		if (nodeType === 3) {
			// Node.TEXT_NODE
			if (domNode.textContent !== text) {
				domNode.textContent = text;
			}
			domNode._vnode = vNode; // Save reference for future comparisons
			return domNode;
		}

		// Node types don't match, replace with text node
		const newNode = document.createTextNode(text);
		(newNode as RenderedElement)._vnode = vNode; // Save reference
		parentElement.replaceChild(newNode, domNode);
		return newNode as RenderedElement;
	}

	// vNode should be a VNode object at this point
	const vNodeObj = vNode as VNode;
	const type = vNodeObj.type;
	const children = vNodeObj.children || [];

	// Handle fragment (when type is undefined or null)
	if (!type) {
		if (nodeType === 11) {
			// Node.DOCUMENT_FRAGMENT_NODE
			diffChildren(
				children,
				domNode as DocumentFragment,
				rootSelector,
				context,
			);
			domNode._vnode = vNode; // Save reference
			return domNode;
		}

		const fragment = renderFragment(children, rootSelector, context);
		(fragment as RenderedElement)._vnode = vNode; // Save reference
		parentElement.replaceChild(fragment, domNode);
		return fragment as RenderedElement;
	}

	// Handle regular elements
	if (nodeType === 1) {
		// Node.ELEMENT_NODE
		const element = domNode as HTMLElement;
		// Compare tag names with lowercase (avoid repeated toLowerCase calls)
		if (element.tagName.toLowerCase() === type.toLowerCase()) {
			processAttributes(element, vNodeObj, rootSelector);
			// diff the elements children
			diffChildren(children, element, rootSelector, context);
			domNode._vnode = vNode; // Save reference
			return domNode;
		}
	}

	// Types don't match, create a new element
	const newElement = renderElement(vNodeObj, rootSelector, context);
	(newElement as RenderedElement)._vnode = vNode; // Save reference
	parentElement.replaceChild(newElement, domNode);
	return newElement;
}
