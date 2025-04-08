import { getRootContext } from "../context";
import type { EventFn, VNode } from "../types";
import { getRootElement } from "../utils";

/**
 * Extracts event handlers from props and stores them in the eventStore
 * for event delegation. This allows the framework to efficiently handle events
 * by attaching a single listener to the root element instead of individual elements.
 *
 * @param vNode - The virtual node containing event handlers in its props
 * @param rootSelector - CSS selector identifying the root DOM element
 * @param elementKey - Unique identifier for the element (used for event delegation)
 */
export function delegateEvents(
	vNode: VNode,
	rootSelector: string,
	elementKey: string,
) {
	if (!vNode.props) return;
	// For each property that starts with "on" (e.g., onclick, onchange)
	// Extract event name (e.g., "click" from "onclick")
	for (const [key, handler] of Object.entries(vNode.props)) {
		if (key.startsWith("on") && typeof handler === "function") {
			const eventName = key.slice(2).toLowerCase();
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
			handlers.get(elementKey)?.set(eventName, handler as EventFn);
		}
	}
}
