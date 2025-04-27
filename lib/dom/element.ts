import domdiff from "domdiff";
import type { ReactiveElement, VNode, VNodeValue } from "../types";
import { isFunction, isObject, isSignal, isVNodeString } from "../utils";
import { processProps } from "./props";
import { setupSignal } from "./reactive";
import { isFlatVNode } from "./utils";

/**
 * Creates a DOM element from a virtual node
 * @param vNode - Virtual node, string or number to create element from
 * @returns DOM node
 */
export function createElement(vNode: VNodeValue, rootSelector: string): Node {
	// Handle undefined or null values
	if (vNode === undefined || vNode === null) {
		console.warn('Attempted to create element from undefined/null vNode');
		return document.createTextNode('');
	}

	// Fast path: string/number nodes
	if (isVNodeString(vNode)) return document.createTextNode(String(vNode));

	// Special case for signals passed directly - unwrap them
	if (isSignal(vNode)) {
		const textNode = document.createTextNode(String(vNode() ?? ''));
		vNode.subscribe((value) => (textNode.textContent = String(value ?? '')));
		return textNode;
	}

	// Handle VNodeFlatFn functions
	if (isFlatVNode(vNode)) {
		const result = vNode();
		// Handle case where a flat function returns undefined
		return createElement(result ?? '', rootSelector);
	}

	// Ensure vNode is an object before destructuring
	if (!isObject(vNode)) {
		console.warn(`Invalid vNode type: ${typeof vNode}`);
		return document.createTextNode(String(vNode ?? ''));
	}

	const { type, props, children = [] } = vNode as VNode;

	// Handle fragments (VNodes without a type property)
	if (!type) {
		const fragment = document.createDocumentFragment();
		const len = children.length;
		for (let i = 0; i < len; i++) {
			const child = children[i];
			if (child != null) {
				fragment.appendChild(createElement(child, rootSelector));
			}
		}
		return fragment;
	}

	// Create the element
	const element = document.createElement(type);

	// Process props
	if (props) {
		processProps(element, props);
	}

	// Process children - with fast paths for common scenarios
	if (children.length === 0) {
		return element;
	} else if (children.length === 1) {
		const child = children[0];
		if (child == null) return element;
		if (isSignal(child)) {
			setupSignal(element, child, "textContent");
			return element;
		}
		return processSingleChild(element, child, rootSelector);
	} else {
		return processMultipleChildren(element, children, rootSelector);
	}
}

/**
 * Process a single child - optimized for the common case
 */
function processSingleChild(
	element: ReactiveElement | DocumentFragment,
	child: VNodeValue,
	rootSelector: string,
): ReactiveElement | DocumentFragment {
	if (isFlatVNode(child)) {
		element.appendChild(createElement(child(), rootSelector));
	} else {
		element.appendChild(
			isObject(child) || isFunction(child)
				? createElement(child as VNode, rootSelector)
				: document.createTextNode(child as string),
		);
	}

	return element;
}

/**
 * Process multiple children efficiently
 */
function processMultipleChildren(
	element: ReactiveElement,
	children: VNode["children"],
	rootSelector: string,
): ReactiveElement {
	// Use DocumentFragment for better performance
	const fragment = document.createDocumentFragment();

	for (const child of children as []) {
		if (child != null) {
			processSingleChild(fragment, child, rootSelector);
		}
	}

	element.appendChild(fragment);
	return element;
}

/**
 * Updates an existing DOM element with new VNode data
 * Efficiently updates only what changed without full element recreation
 * 
 * @param element - The existing DOM element to update
 * @param oldVNode - Previous VNode representation
 * @param newVNode - New VNode representation to apply
 */
export function updateElement(
	element: HTMLElement,
	oldVNode: VNode,
	newVNode: VNode
): void {
	// Skip update if vnodes are identical
	if (oldVNode === newVNode) return;

	// Handle props updates
	if (oldVNode.props || newVNode.props) {
		const oldProps = oldVNode.props || {};
		const newProps = newVNode.props || {};

		// Remove props that no longer exist
		for (const propName in oldProps) {
			if (!(propName in newProps)) {
				// Handle special cases for attributes
				if (propName === 'class' || propName === 'className') {
					element.className = '';
				} else if (propName === 'style') {
					element.removeAttribute('style');
				} else if (propName.startsWith('on')) {
					(element as unknown as Record<string, unknown>)[propName.toLowerCase()] = null;
				} else {
					element.removeAttribute(propName);
				}
			}
		}

		// Apply new or changed props
		processProps(element, newProps);
	}

	// Handle children updates if the element type is the same
	if (newVNode.children && oldVNode.children) {
		if (newVNode.children.length === 0) {
			// Clear children
			element.textContent = '';
		} else if (newVNode.children.length === 1 && oldVNode.children.length === 1) {
			// Optimize for the common single child case
			const newChild = newVNode.children[0];
			const oldChild = oldVNode.children[0];

			if (isVNodeString(newChild) && isVNodeString(oldChild)) {
				// Simple text update
				if (newChild !== oldChild) {
					element.textContent = newChild as string;
				}
			} else if (isSignal(newChild) && isSignal(oldChild)) {
				// Signal replacement - no need to do anything as signals handle their own updates
			} else {
				// Handle more complex single child updates
				const oldChildNode = element.firstChild;
				if (oldChildNode) {
					const rootSelector = ''; // We don't need rootSelector for updating
					const newChildNode = createElement(newChild, rootSelector);
					element.replaceChild(newChildNode, oldChildNode);
				}
			}
		} else {
			// Multiple children case - use domdiff for efficiency
			const oldChildNodes = Array.from(element.childNodes);
			const newChildNodes = newVNode.children.map(child =>
				isVNodeString(child) ? document.createTextNode(child as string) :
					createElement(child, '')
			);

			// Use the already imported domdiff directly
			domdiff(element, oldChildNodes, newChildNodes);
		}
	}
}
