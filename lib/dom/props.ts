import type { EventFn, ReactiveElement, Signal } from "../types";
import { isFunction, isSignal } from "../utils";
import { setupSignal } from "./reactive";
import { checkNullish } from "./utils";

// Map property names to their DOM attribute equivalents
export const PROP_MAP: Record<string, string> = {
	class: "className",
	for: "htmlFor",
	objectData: "data",
};

/**
 * Process element properties efficiently
 */
export function processProps(
	element: ReactiveElement,
	props: Record<string, unknown>,
) {
	for (const key in props) {
		const value = props[key];

		// Skip key prop (used only for reconciliation)
		if (key === "key") continue;

		// Fast path for event handlers
		if (key.startsWith("on") && isFunction(value)) {
			element.addEventListener(key.slice(2).toLowerCase(), value as EventFn);
			continue;
		}

		// Handle signals
		if (isSignal(value)) {
			setupSignal(element, value as Signal<unknown>, key);
			continue;
		}

		// Regular values
		handleProp(element, key, value as string);
	}
}

/**
 * Handles setting properties on an element
 */
export function handleProp<T extends HTMLElement>(
	element: T,
	key: string,
	value: string | number | boolean,
) {
	// Skip nullish values early
	if (checkNullish(element, key, value)) return;

	if (key === "textContent") {
		element.textContent = value as string;
		return;
	}

	if (key === "class") {
		element.className = value as string;
		return;
	}

	if (key === "for") {
		(element as unknown as HTMLLabelElement).htmlFor = value as string;
		return;
	}

	if (key in element) {
		// Use type assertion with proper constraints
		(element as unknown as Record<string, unknown>)[key] = value;
	} else {
		// Fallback to setAttribute if direct property setting fails
		element.setAttribute(key, value as string);
	}
}
