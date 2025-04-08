import { getRootContext } from "../context";
import { cleanupEventHandlers } from "../events";
import { renderElement } from "../render/element";
import type { Context, VNodeValue } from "../types";
import { diffNode } from "./nodes";

/**
 * Reconciles differences between actual DOM children and virtual DOM node children.
 * The function handles three main cases:
 * 1. If there are more DOM children than virtual children, it removes excess DOM nodes
 * 2. For existing DOM nodes that have a corresponding virtual node, it updates them
 * 3. For virtual nodes that don't have a corresponding DOM node, it creates and appends new DOM nodes
 *
 * @param vNodeChildren - Array of virtual DOM nodes (VNode objects or primitive values like strings/numbers)
 * @param parentElement - The parent DOM element containing the children being diffed
 * @param rootSelector - CSS selector string that identifies the root element
 * @param context - Additional context information for rendering
 *
 * @remarks
 * The function optimizes DOM operations by batching removals from the end to avoid layout thrashing.
 */
export function diffChildren(
	vNodeChildren: VNodeValue[],
	parentElement: Element | DocumentFragment,
	rootSelector: string,
	context: Context,
): void {
	const childNodesTotal = parentElement.childNodes.length;

	// Prepopulate the array with the correct number of child nodes
	// Then assign the nodes by index
	const domChildren = new Array(childNodesTotal);
	for (let i = 0; i < childNodesTotal; i++) {
		domChildren[i] = parentElement.childNodes[i];
	}

	const domChildrenTotal = domChildren.length;
	const vNodeChildrenTotal = vNodeChildren.length;

	// Handle case where we have more DOM children than virtual children
	if (domChildrenTotal > vNodeChildrenTotal) {
		const rootContext = getRootContext(rootSelector, context);
		const nodesToRemoveTotal = domChildrenTotal - vNodeChildrenTotal;

		// Count down from the end of the DOM children
		for (
			let i = domChildrenTotal - 1;
			i >= domChildrenTotal - nodesToRemoveTotal;
			i--
		) {
			const nodeToRemove = domChildren[i];
			cleanupEventHandlers(nodeToRemove, rootContext);
			parentElement.removeChild(nodeToRemove);
		}
	}

	// Process each child node
	// If there are more virtual children than DOM children, we need to append new nodes
	// Otherwise, we update the existing nodes
	for (let i = 0; i < vNodeChildrenTotal; i++) {
		if (i < domChildrenTotal) {
			diffNode(
				domChildren[i],
				vNodeChildren[i],
				parentElement,
				rootSelector,
				context,
			);
		} else {
			parentElement.appendChild(
				renderElement(vNodeChildren[i], rootSelector, context),
			);
		}
	}
}
