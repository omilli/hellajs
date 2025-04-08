import type { VNodeValue } from "../types";

// Static counter for key generation (module-level counter)
let keyCounter = 0;

/**
 * Generates a unique key using an incremental numeric counter.
 * This is more efficient than random string generation for large-scale applications
 * as it avoids string concatenation and Math.random() calls.
 *
 * @returns A unique string key representing the counter value
 */
export function generateKey(): string {
	// Reset counter if it approaches MAX_SAFE_INTEGER to prevent overflow
	if (keyCounter >= Number.MAX_SAFE_INTEGER) {
		keyCounter = 0;
	}
	return (++keyCounter).toString();
}

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
		throw new Error("Root selector must be a string");
	}
	// Get the root element
	const rootElement = document.querySelector(rootSelector);
	// Throw if root element not found
	if (!rootElement) {
		throw new Error("Root element not found");
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
