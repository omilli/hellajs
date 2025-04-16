import { getDefaultContext } from "../context";
import type { RenderedElement, VNode } from "../types";
import { getRootElement } from "../utils";
import { diffChildren } from "./children";
import { renderElement } from "./element";

/**
 * Updates an existing DOM tree with changes from a virtual DOM node.
 * When the root element already has children, it performs an intelligent diff
 * to minimize DOM operations. Otherwise, it performs a fresh render.
 *
 * @param vNode - The virtual DOM node representing the new state
 * @param rootSelector - CSS selector string identifying where to diff
 * @param context - Optional context object (uses default if not provided)
 * @returns The resulting DOM element, text node, or document fragment
 */
export function diff(
	vNode: VNode,
	rootSelector: string,
	context = getDefaultContext(),
): RenderedElement {
	const rootElement = getRootElement(rootSelector);
	const hasChildren = rootElement.childNodes.length > 0;

	if (hasChildren) {
		diffChildren([vNode], rootElement, rootSelector, context);
		return rootElement as HTMLElement;
	}

	// If there are no children, we need to render the new virtual node
	const element = renderElement(vNode, rootSelector, context);
	rootElement.appendChild(element);

	return element instanceof DocumentFragment ? rootElement : element;
}
