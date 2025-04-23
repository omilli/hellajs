import { delegateEvent } from "../events";
import type { EventFn, RenderPropHandler, VNode, VNodeValue } from "../types";
import { castToString, generateKey, isVNodeString } from "../utils";

const DIRECT_PROPS = new Set([
	"id",
	"className",
	"value",
	"checked",
	"disabled",
	"readOnly",
	"selected",
] as const);

type DirectProp = typeof DIRECT_PROPS extends Set<infer T> ? T : never;

type HTMLE = HTMLElement & {
	[key in DirectProp]?: string;
};

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
	private readonly element: HTMLElement;
	private readonly vNode: VNode;
	private readonly rootSelector: string;
	private readonly elementDataset: DOMStringMap;

	constructor(element: HTMLElement, vNode: VNode, rootSelector: string) {
		this.element = element;
		this.vNode = vNode;
		this.rootSelector = rootSelector;
		this.elementDataset = element.dataset;
	}

	classProp(vNodeClassName: string): void {
		if (this.element.className !== vNodeClassName) {
			this.element.className = vNodeClassName;
		}
	}

	boolProp(key: string): void {
		if (!this.element.hasAttribute(key)) {
			this.element.setAttribute(key, "");
		}
	}

	regularProp(key: string, value: VNodeValue): void {
		const element = this.element;
		const strValue = castToString(value);
		if (key === "id") {
			if (element.id !== strValue) element.id = strValue;
		} else if (key === "value" && "value" in element) {
			if ((element as HTMLInputElement).value !== strValue) {
				(element as HTMLInputElement).value = strValue;
			}
		} else if (key === "href" && "href" in element) {
			if ((element as HTMLAnchorElement).href !== strValue) {
				(element as HTMLAnchorElement).href = strValue;
			}
		} else {
			if (!this.element.hasAttribute(strValue)) {
				this.element.setAttribute(key, strValue);
			}
		}
	}

	datasetProp(datasetProps: Record<string, string>): void {
		const dataset = this.elementDataset;
		for (const key in datasetProps) {
			const value = datasetProps[key];
			if (value === undefined || value === null) continue;
			const strValue = typeof value === "string" ? value : castToString(value);
			if (dataset[key] !== strValue) {
				dataset[key] = strValue;
			}
		}
	}

	process(): void {
		const { props } = this.vNode;
		if (!props) return;

		// Process properties first (this will mark what needs to be kept)
		// Fast path for empty props
		if (!props) return;

		const keys = Object.keys(props);
		const len = keys.length;
		if (len === 0) return;

		for (let i = 0; i < len; i++) {
			const key = keys[i];
			const value = props[key];

			// Fast check for event handlers (on*)
			if (key.length > 2 && key[0] === "o" && key[1] === "n") continue;

			// Most common props first for better branch prediction
			if (key === "className") {
				this.classProp(value as string);
				continue;
			}

			if (value === true) {
				this.boolProp(key);
				continue;
			}

			if (isVNodeString(value)) {
				this.regularProp(key, value as VNodeValue);
				continue;
			}

			if (key === "dataset" && this.elementDataset) {
				this.datasetProp(value as Record<string, string>);
			}
		}

		// Handle event delegation - minimize object creation
		let elementKey: string | undefined;
		const dataset = this.elementDataset;

		for (const key in props) {
			// Fast check for event handlers (starts with "on")
			// 'o'=111, 'n'=110
			if (key.charCodeAt(0) === 111 && key.charCodeAt(1) === 110) {
				const handler = props[key];
				if (typeof handler === "function") {
					// Lazy initialize element key only when needed
					if (!elementKey) {
						dataset.eKey ??= generateKey();
						elementKey = dataset.eKey;
					}

					// Avoid string concatenation by directly slicing
					delegateEvent(
						this.vNode,
						key.slice(2).toLowerCase(),
						handler as EventFn,
						this.rootSelector,
						elementKey,
					);
				}
			}
		}
	}
}
