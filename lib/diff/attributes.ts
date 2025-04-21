import { delegateEvent } from "../events";
import type { EventFn, RenderPropHandler, VNode, VNodeValue } from "../types";
import { castToString, generateKey } from "../utils";
import { propProcessor } from "./props";

const attributesToRemove = new Set<string>();

/**
 * Processes attributes for an HTML element based on its virtual node representation.
 * Creates an AttributeProcessor instance and executes the processing.
 *
 * @param element - The HTML element whose attributes are to be processed
 * @param vNode - The virtual node representation of the element
 * @param rootSelector - The CSS selector for the root element
 */
export function processAttributes(
	element: HTMLElement,
	vNode: VNode,
	rootSelector: string,
): void {
	const processor = new AttributeProcessor(element, vNode, rootSelector);
	processor.process();
}

class AttributeProcessor {
	private element: HTMLElement;
	private vNode: VNode;
	private rootSelector: string;
	private propHandler: RenderPropHandler;

	constructor(element: HTMLElement, vNode: VNode, rootSelector: string) {
		this.element = element;
		this.vNode = vNode;
		this.rootSelector = rootSelector;
		attributesToRemove.clear();

		// Create the handler object once during initialization
		this.propHandler = {
			classProp: (vNodeClassName: string) => this.classProp(vNodeClassName),
			boolProp: (key: string) => this.boolProp(key),
			regularProp: (key: string, value: VNodeValue) =>
				this.regularProp(key, value),
			datasetProp: (datasetProps: Record<string, string>) =>
				this.datasetProp(datasetProps),
		};
	}

	process(): void {
		const { props } = this.vNode;
		if (!props) return;

		// Process properties first (this will mark what needs to be kept)
		propProcessor(props, this.propHandler);

		// Then remove only what's left in attributesToRemove
		for (const attr of attributesToRemove) {
			if (attr.slice(0, 2) !== "on") {
				// Avoid removing event handlers
				this.element.removeAttribute(attr);
			}
		}

		// Handle event delegation
		this.handleEventProps(props);
	}

	private classProp(vNodeClassName: string): void {
		if (this.element.className !== vNodeClassName) {
			this.element.className = vNodeClassName;
		}
	}

	private boolProp(key: string): void {
		attributesToRemove.delete(key);
		if (!this.element.hasAttribute(key)) {
			this.element.setAttribute(key, "");
		}
	}

	private regularProp(key: string, value: VNodeValue): void {
		attributesToRemove.delete(key);
		const strValue = castToString(value);
		if (this.element.getAttribute(key) !== strValue) {
			this.element.setAttribute(key, strValue);
		}
	}

	private datasetProp(datasetProps: Record<string, string>): void {
		const { dataset } = this.element;
		for (const [key, value] of Object.entries(datasetProps)) {
			const strValue = castToString(value);
			if (dataset[key] !== strValue) {
				dataset[key] = strValue;
			}
		}
	}

	private handleEventProps(props: Record<string, unknown>): void {
		// Initialize element key if there are event handlers
		let elementKey: string | undefined;

		for (const [key, handler] of Object.entries(props)) {
			// Check if property is an event handler (starts with "on")
			// 'o'=111, 'n'=110
			if (
				key.charCodeAt(0) === 111 &&
				key.charCodeAt(1) === 110 &&
				typeof handler === "function"
			) {
				// Ensure we have a key for this element (initialize only once)
				if (!elementKey) {
					const { dataset } = this.element;
					dataset.eKey ??= generateKey();
					elementKey = dataset.eKey;
				}

				// Extract event name (e.g., "click" from "onclick")
				const eventName = key.slice(2).toLowerCase();

				// Delegate this specific event
				delegateEvent(
					this.vNode,
					eventName,
					handler as EventFn,
					this.rootSelector,
					elementKey,
				);
			}
		}
	}
}
