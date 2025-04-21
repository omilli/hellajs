import { getRootContext } from "../context";
import type { RenderedElement, RootContext } from "../types";
import { getRootElement } from "../utils";

/**
 * Removes all event listeners associated with a root element.
 * This is useful for cleanup when unmounting components.
 *
 * @param rootSelector - CSS selector identifying the root DOM element
 */
export function cleanupRootEvents(rootSelector: string): void {
	const rootContext = getRootContext(rootSelector);
	const { events } = rootContext;
	const { delegates, listeners } = events;
	const rootElement = getRootElement(rootSelector);

	for (const [eventName, handler] of listeners.entries()) {
		rootElement.removeEventListener(eventName, handler);
	}

	listeners.clear();
	delegates.clear();
	events.listeners.clear();
}

/**
 * Recursively removes event handlers from an element and its children.
 *
 * @param element - The DOM element to clean up event handlers from
 * @param rootContext - The root context containing the events registry
 * @returns void
 *
 * This function checks if the element has registered event handlers (identified
 * by a data-eKey attribute) and removes them from the rootContext's event handler
 * registry. It then recursively processes all child nodes to clean up their
 * event handlers as well.
 */
export function cleanupEventHandlers(
	element: ChildNode,
	rootContext: RootContext,
) {
	if (!(element instanceof HTMLElement)) return;

	if (element.dataset?.eKey) {
		rootContext.events.handlers.delete(element.dataset.eKey);
	}

	for (let i = 0; i < element.childNodes.length; i++) {
		cleanupEventHandlers(element.childNodes[i] as HTMLElement, rootContext);
	}
}
