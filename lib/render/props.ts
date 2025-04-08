import { delegateEvents } from "../events";
import type {
	HTMLTagName,
	RenderPropHandler,
	VNode,
	VNodeProps,
	VNodeValue,
} from "../types";
import { castToString, generateKey, isVNodeString } from "../utils";

/**
 * Processes a properties object by categorizing and handling different property types.
 *
 * @param props - An object containing properties to be processed
 * @param options - Handler callbacks for different property types
 */
export function propProcessor<T extends HTMLTagName = HTMLTagName>(
	props: VNodeProps<T>,
	{ classProp, boolProp, regularProp, datasetProp }: RenderPropHandler,
) {
	// Iterate over the vNode props
	for (const [key, value] of Object.entries(props)) {
		switch (true) {
			// break immediately if the key starts with "on"
			case key.startsWith("on"):
				break;
			case key === "className":
				// Handle className separately
				classProp(value as string);
				break;
			case key === "dataset":
				// Handle dataset object if handler is provided
				if (datasetProp) {
					datasetProp(value as Record<string, string>);
				}
				break;
			case value === true:
				// Handle boolean attributes
				boolProp(key);
				break;
			// Handle other attributes
			case !isVNodeString(value):
				regularProp(key, value as VNodeValue);
				break;
		}
	}
}

/**
 * Processes and applies properties to a given DOM element.
 *
 * @param element - The DOM element to which properties will be applied
 * @param props - An object containing properties to be applied to the element
 */
export function processProps(
	element: HTMLElement,
	props: VNode["props"] = {},
): void {
	propProcessor(props, {
		classProp(className) {
			// Set the className of the element
			element.className = className;
		},
		boolProp(key) {
			// Set boolean attributes to empty strings
			element.setAttribute(key, "");
		},
		regularProp(key, value) {
			// Cast the value to a string and set it as an attribute
			element.setAttribute(key, castToString(value));
		},
		datasetProp(datasetObj) {
			// Process each key-value pair in the dataset object
			for (const [key, value] of Object.entries(datasetObj)) {
				element.dataset[key] = castToString(value);
			}
		},
	});
}

/**
 * Processes event properties for a given VNode and sets up event delegation.
 *
 * @param element - The DOM element to which event properties will be applied
 * @param vNode - The VNode containing event properties
 * @param rootSelector - A CSS selector for the root element
 */
export function processEventProps(
	element: HTMLElement,
	vNode: VNode,
	rootSelector: string,
): void {
	// Get all the event props by filtering vNode props for keys that start with on
	const eventProps = Object.entries(vNode.props || {}).filter(([key]) =>
		key.startsWith("on"),
	);
	// If we have event props
	if (eventProps.length > 0) {
		// Set the eKey if one doesn't exist
		element.dataset.eKey ??= generateKey();
		// Delegate events for this vNode to the root element
		delegateEvents(vNode, rootSelector, element.dataset.eKey as string);
	}
}
