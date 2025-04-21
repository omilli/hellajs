import { getRootContext } from "../context";
import type { EventFn, VNode } from "../types";
import { getRootElement } from "../utils";

/**
 * Delegates a single event handler for the given element
 *
 * @param vNode - The virtual node containing the event handler
 * @param eventName - Name of the event (without "on" prefix)
 * @param handler - The event handler function
 * @param rootSelector - CSS selector identifying the root DOM element
 * @param elementKey - Unique identifier for the element
 */
export function delegateEvent(
	vNode: VNode,
	eventName: string,
	handler: EventFn,
	rootSelector: string,
	elementKey: string,
) {
	const rootContext = getRootContext(rootSelector);
	const { events } = rootContext;
	const { delegates, handlers, listeners } = events;

	// If this event type hasn't been delegated yet, set it up
	if (!delegates.has(eventName)) {
		delegates.add(eventName);

		const delegatedHandler = (e: Event) => {
			const { props = {} } = vNode;

			// Handle global event modifiers if specified
			if (props.preventDefault) e.preventDefault();
			if (props.stopPropagation) e.stopPropagation();

			// Handle the event for the target element
			const handleTarget = (el?: HTMLElement) => {
				const key = el?.dataset.eKey;

				if (!el) return;

				if (key && handlers.has(key)) {
					handlers.get(key)?.get(eventName)?.(e, el);
					return;
				}
			};

			// First check if the target element itself has the data-e-key attribute
			const target = e.target as HTMLElement;
			handleTarget(
				target?.dataset?.eKey
					? target
					: (target.closest("[data-e-key]") as HTMLElement),
			);
		};

		const rootElement = getRootElement(rootSelector);
		rootElement.addEventListener(eventName, delegatedHandler);
		listeners.set(eventName, delegatedHandler);
	}

	// Create event map for this element if it doesn't exist
	if (!handlers.has(elementKey)) {
		handlers.set(elementKey, new Map());
	}

	// Register the handler for this element and event type
	handlers.get(elementKey)?.set(eventName, handler);
}
