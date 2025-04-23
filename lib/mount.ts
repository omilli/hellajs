import { type Signal, signal } from "./signal";
import type { EventFn, VNode } from "./types";
import domdiff from 'domdiff';

type ReactiveDom = WeakMap<HTMLElement, WeakMap<Signal<unknown>, Set<unknown>>>;

const reactiveDom: ReactiveDom = new WeakMap();

export function mount(vNode: VNode, selector?: string) {
	const root = selector ? document.querySelector(selector) : document.body;
	if (!root) {
		throw new Error(`Element with selector "${selector}" not found`);
	}
	root.appendChild(createElement(vNode));
}

function createElement(vNode: VNode) {
	if (typeof vNode === "string" || typeof vNode === "number") {
		return document.createTextNode(String(vNode));
	}

	const element = document.createElement(vNode.type as string);
	const elementMap = reactiveDom.get(element) || new WeakMap();

	const setupSignal = (_signal: Signal<any>, key: string) => {
		const signalSet = elementMap.get(_signal) || new Set();
		signalSet.add(key);
		elementMap.set(_signal, signalSet);
		reactiveDom.set(element, elementMap);

		// Map certain property names to their HTML attribute counterparts
		const attributeName = mapPropToAttribute(key);

		// Set initial value
		if (key.startsWith("data-")) {
			const dataKey = key.slice(5);
			element.dataset[dataKey] = _signal();
		} else if (attributeName !== key) {
			// Handle special cases like className -> class
			element.setAttribute(attributeName, _signal());
		} else {
			(element as any)[key] = _signal();
		}

		// Set up subscription immediately
		_signal.subscribe((value) => {
			if (key.startsWith("data-")) {
				const dataKey = key.slice(5);
				element.dataset[dataKey] = value;
			} else if (attributeName !== key) {
				// Handle special cases like className -> class
				element.setAttribute(attributeName, value);
			} else {
				(element as any)[key] = value;
			}
		});
	};

	if (typeof vNode.children?.[0] === "function") {
		const signal = vNode.children[0] as Signal<any>;
		setupSignal(signal, "textContent");
	}

	if (vNode.props) {
		for (const [key, value] of Object.entries(vNode.props)) {
			if (key.startsWith("on")) {
				element.addEventListener(key.slice(2).toLowerCase(), value as EventFn);
				continue;
			}

			if (typeof value === "function") {
				setupSignal(value as Signal<unknown>, key);
				continue;
			}

			if (key === "dataset") {
				const dataset = value as Record<string, string>;
				for (const [dataKey, dataVal] of Object.entries(dataset)) {
					if (typeof dataVal === "function") {
						setupSignal(dataVal as Signal<unknown>, `data-${dataKey}`);
					} else {
						element.dataset[dataKey] = dataVal;
					}
				}
				continue;
			}

			// Map property names to HTML attribute names before setting
			const attributeName = mapPropToAttribute(key);
			element.setAttribute(attributeName, value as string);
		}
	}

	if (vNode.children) {
		vNode.children.forEach((child) => {
			if (typeof child === "string" || typeof child === "number") {
				element.appendChild(document.createTextNode(String(child)));
			} else if (typeof child === "object") {
				element.appendChild(createElement(child));
			}
		});
	}

	return element;
}

// Helper function to map React-style prop names to HTML attribute names
function mapPropToAttribute(prop: string): string {
	switch (prop) {
		case "className":
			return "class";
		case "htmlFor":
			return "for";
		default:
			return prop;
	}
}

// List function that creates reactive nodes from an array signal
export function list<T>(arraySignal: Signal<T[]>, rootSelector: string, mapFn: (item: Signal<T>, index?: Signal<number>) => VNode): VNode[] {
	// Store the current VNodes to return them immediately
	const currentNodes: VNode[] = [];

	// Create index tracking signals for each item
	const indexSignals: Signal<number>[] = [];

	// Create item signals that will update when the array changes
	const itemSignals: Signal<T>[] = [];

	// Initialize with current array values
	arraySignal().forEach((item, i) => {
		const itemSignal = signal(item);
		const indexSignal = signal(i);

		itemSignals.push(itemSignal);
		indexSignals.push(indexSignal);

		// Create initial nodes
		currentNodes.push(mapFn(itemSignal, indexSignal));
	});

	// Set up subscription to update nodes when array changes
	arraySignal.subscribe((newArray) => {
		const parentElement = document.querySelector(rootSelector);
		if (!parentElement) {
			throw new Error(`Element with selector "${rootSelector}" not found`);
		}
		// Track the current DOM nodes
		let domNodes = Array.from(parentElement.childNodes);

		// Update existing signals for reused items
		// Create new signals for new items
		const newItemSignals: Signal<T>[] = [];
		const newIndexSignals: Signal<number>[] = [];
		const newVNodes: VNode[] = [];

		// Process the new array
		newArray.forEach((item, i) => {
			// Check if this item has an id we can use to identify it
			const hasId = typeof item === 'object' && item && 'id' in item;
			const itemId = hasId ? (item as any).id : null;

			// Try to find an existing signal for this item
			let existingIdx = -1;
			if (hasId) {
				existingIdx = itemSignals.findIndex(sig => {
					const value = sig();
					return typeof value === 'object' && value !== null && 'id' in (value as object) && (value as any).id === itemId;
				});
			}

			if (existingIdx >= 0) {
				// Reuse existing signal but update its value
				itemSignals[existingIdx].set(item);
				indexSignals[existingIdx].set(i);

				newItemSignals.push(itemSignals[existingIdx]);
				newIndexSignals.push(indexSignals[existingIdx]);
			} else {
				// Create new signals for new items
				const itemSignal = signal(item);
				const indexSignal = signal(i);

				newItemSignals.push(itemSignal);
				newIndexSignals.push(indexSignal);
			}

			// Create the VNode with this signal
			newVNodes.push(mapFn(newItemSignals[i], newIndexSignals[i]));
		});

		// Create DOM nodes from VNodes
		const newDomNodes = newVNodes.map(node => createElement(node));

		// Use domdiff to update the DOM efficiently
		domdiff(
			parentElement,
			domNodes,
			newDomNodes,
		);

		// Update our tracking arrays
		itemSignals.length = 0;
		indexSignals.length = 0;
		currentNodes.length = 0;

		itemSignals.push(...newItemSignals);
		indexSignals.push(...newIndexSignals);
		currentNodes.push(...newVNodes);
	});

	return currentNodes;
}
