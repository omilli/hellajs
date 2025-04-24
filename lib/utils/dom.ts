import type { VNodeValue } from "../types";

/**
 * Retrieves a DOM element using the provided CSS selector.
 *
 * @param rootSelector - CSS selector string to identify the target DOM element
 * @returns The DOM element that matches the specified selector
 * @throws Error When the selector is not a string or when no matching element is found
 */
export function getRootElement(rootSelector?: string): HTMLElement {
	// Throw if rootSelector not a string
	if (typeof rootSelector !== "string") {
		throw new Error(`rootSelector must be a string, received: ${typeof rootSelector}`);
	}
	// Get the root element
	const rootElement = document.querySelector(rootSelector);
	// Throw if root element not found
	if (!rootElement) {
		console.warn(`No element found for selector: ${rootSelector}`);
	}
	return rootElement as HTMLElement;
}

/**
 *	Checks if the provided virtual node (vNode) is a text node.
 *
 * @param value - The virtual node to check
 *
 * @returns True if the vNode is a text node (string or number), false otherwise
 */
export function isVNodeString(value: unknown): boolean {
	return typeof value === "string" || typeof value === "number";
}

/**
 * Casts a virtual node value to a string.
 *
 * @param value - The virtual node value to cast
 *
 * @returns The string representation of the value
 */
export function castToString(value: VNodeValue): string {
	return typeof value === "string" ? value : String(value);
}
