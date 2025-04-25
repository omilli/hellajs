import type { ReactiveElement, Signal } from "../types";
import { handleProps } from "./props";

/**
 * Sets up a signal to update an element property/attribute when the signal value changes
 *
 * @param element - Element to update
 * @param sig - Signal to track
 * @param key - Property/attribute name to update
 */
export function setupSignal(
	element: ReactiveElement,
	sig: Signal<unknown>,
	key: string,
) {
	// Initial value
	handleProps(element, key, sig() as string);

	// Subscribe to changes with immediate DOM update (critical for reactivity)
	const cleanup = sig.subscribe((value) => {
		// Fast path for certain common properties
		if (key === "textContent") {
			element.textContent = value as string;
			return;
		}

		if (key === "class" || key === "className") {
			element.className = (value as string) || "";
			return;
		}
	});

	// Store cleanup function
	if (!element._cleanups) {
		element._cleanups = [];
	}
	element._cleanups.push(cleanup);
}
