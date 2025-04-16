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
	const { nodeType, textContent } = domNode;

	// Handle text nodes
	if (isVNodeString(vNode)) {
		const text = castToString(vNode);

		if (nodeType === 3) {
			if (textContent !== text) {
				domNode.textContent = text;
			}
			return domNode;
		}

		const newNode = document.createTextNode(text);
		parentElement.replaceChild(newNode, domNode);
		return newNode;
	}

	// vNode should be a VNode object at this point
	const { type, children = [] } = vNode as VNode;

	// Handle fragment (when type is undefined or null)
	if (!type) {
		if (nodeType === 11) {
			diffChildren(
				children,
				domNode as DocumentFragment,
				rootSelector,
				context,
			);
			return domNode;
		}

		const fragment = renderFragment(children, rootSelector, context);
		parentElement.replaceChild(fragment, domNode);
		return fragment;
	}

	// Handle regular elements
	if (nodeType === 1 && domNode instanceof HTMLElement) {
		if ((domNode as HTMLElement).tagName.toLowerCase() === type.toLowerCase()) {
			processAttributes(domNode, vNode as VNode, rootSelector);
			// diff the elements children
			diffChildren(
				(vNode as VNode).children || [],
				domNode,
				rootSelector,
				context,
			);
			return domNode;
		}
	}

	// Types don't match, create a new element
	const newElement = renderElement(vNode, rootSelector, context);
	parentElement.replaceChild(newElement, domNode);
	return newElement;
}
