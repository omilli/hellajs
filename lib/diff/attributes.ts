import { delegateEvents } from "../events";
import type { RenderPropHandler, VNode, VNodeValue } from "../types";
import { castToString, generateKey } from "../utils";
import { propProcessor } from "./props";

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
	private attributesToRemove: Set<string>;
	private propHandler: RenderPropHandler;

	constructor(element: HTMLElement, vNode: VNode, rootSelector: string) {
		this.element = element;
		this.vNode = vNode;
		this.rootSelector = rootSelector;
		this.attributesToRemove = new Set<string>();

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

		// Find attributes to remove
		this.identifyAttributesToRemove();

		// Process properties
		propProcessor(props, this.propHandler);

		// Remove unused attributes
		this.removeUnusedAttributes();

		// Handle event delegation
		this.handleEventProps(props);
	}

	private identifyAttributesToRemove(): void {
		const { attributes } = this.element;
		for (let i = 0; i < attributes.length; i++) {
			const name = attributes[i].name;

			// 'd'=100, 'a'=97, 't'=116, 'a'=97, '-'=45
			const isData =
				name.charCodeAt(0) === 100 &&
				name.charCodeAt(1) === 97 &&
				name.charCodeAt(2) === 116 &&
				name.charCodeAt(3) === 97 &&
				name.charCodeAt(4) === 45;

			const shouldRemoveProp = !isData && name !== "class";

			if (shouldRemoveProp) {
				this.attributesToRemove.add(name);
			}
		}
	}

	private classProp(vNodeClassName: string): void {
		if (this.element.className !== vNodeClassName) {
			this.element.className = vNodeClassName;
		}
	}

	private boolProp(key: string): void {
		this.attributesToRemove.delete(key);
		if (!this.element.hasAttribute(key)) {
			this.element.setAttribute(key, "");
		}
	}

	private regularProp(key: string, value: VNodeValue): void {
		this.attributesToRemove.delete(key);
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

	private removeUnusedAttributes(): void {
		for (const attr of this.attributesToRemove) {
			// 'o'=111, 'n'=110
			if (!(attr.charCodeAt(0) === 111 && attr.charCodeAt(1) === 110)) {
				this.element.removeAttribute(attr);
			}
		}
	}

	private handleEventProps(props: Record<string, unknown>): void {
		const keys = Object.keys(props);
		let hasEventProps = false;

		for (let i = 0, len = keys.length; i < len; i++) {
			const key = keys[i];
			// 'o'=111, 'n'=110
			if (key.charCodeAt(0) === 111 && key.charCodeAt(1) === 110) {
				hasEventProps = true;
				break;
			}
		}

		if (hasEventProps) {
			const { dataset } = this.element;
			dataset.eKey ??= generateKey();
			delegateEvents(this.vNode, this.rootSelector, dataset.eKey);
		}
	}
}
