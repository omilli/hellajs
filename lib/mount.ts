import { type Signal, signal } from "./signal";
import type { EventFn, VNode } from "./types";
import domdiff from 'domdiff';

type ReactiveDom = WeakMap<HTMLElement, WeakMap<Signal<unknown>, Set<unknown>>>;

const reactiveDom: ReactiveDom = new WeakMap();

// Static property mapping for faster lookups (no runtime switch cost)
const PROP_MAP: Record<string, string> = {
	className: "class",
	htmlFor: "for"
};

export function mount(vNode: VNode, selector?: string) {
	const root = selector ? document.querySelector(selector) : document.body;
	if (!root) {
		throw new Error(`Element with selector "${selector}" not found`);
	}
	root.appendChild(createElement(vNode));
}

function createElement(vNode: VNode) {
	// Fast path for primitives
	if (typeof vNode !== "object") {
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
		const attributeName = PROP_MAP[key] || key;
		const isDataAttr = key.startsWith("data-");
		const dataKey = isDataAttr ? key.slice(5) : null;

		// Set initial value (avoiding repeated checks in the callback)
		const value = _signal();
		if (isDataAttr) {
			element.dataset[dataKey!] = value;
		} else if (attributeName !== key) {
			element.setAttribute(attributeName, value);
		} else {
			// Direct property assignment is faster than setAttribute
			try {
				(element as any)[key] = value;
			} catch (e) {
				// Fallback to setAttribute if direct assignment fails
				element.setAttribute(key, value);
			}
		}

		// Create optimized callback based on attribute type
		let callback;
		if (isDataAttr) {
			callback = (value: any) => element.dataset[dataKey!] = value;
		} else if (attributeName !== key) {
			callback = (value: any) => element.setAttribute(attributeName, value);
		} else {
			callback = (value: any) => {
				try {
					(element as any)[key] = value;
				} catch (e) {
					element.setAttribute(key, value);
				}
			};
		}

		// Set up subscription with optimized callback
		_signal.subscribe(callback);
	};

	if (typeof vNode.children?.[0] === "function") {
		setupSignal(vNode.children[0] as Signal<any>, "textContent");
	}

	if (vNode.props) {
		// Use for...in for better performance with object literals
		for (const key in vNode.props) {
			const value = vNode.props[key];

			// Event handler fast path
			if (key.startsWith("on") && typeof value === "function") {
				element.addEventListener(key.slice(2).toLowerCase(), value as EventFn);
				continue;
			}

			// Signal handling
			if (typeof value === "function") {
				setupSignal(value as Signal<unknown>, key);
				continue;
			}

			// Dataset object handling
			if (key === "dataset" && typeof value === "object") {
				const dataset = value as Record<string, string>;
				for (const dataKey in dataset) {
					const dataVal = dataset[dataKey];
					if (typeof dataVal === "function") {
						setupSignal(dataVal as Signal<unknown>, `data-${dataKey}`);
					} else {
						element.dataset[dataKey] = dataVal;
					}
				}
				continue;
			}

			// Direct attribute assignment
			const attributeName = PROP_MAP[key] || key;

			// Direct property assignment is faster when possible
			if (attributeName === key) {
				try {
					(element as any)[key] = value;
				} catch (e) {
					element.setAttribute(key, value as string);
				}
			} else {
				element.setAttribute(attributeName, value as string);
			}
		}
	}

	if (vNode.children?.length) {
		// Use DocumentFragment for batch DOM insertion
		const fragment = document.createDocumentFragment();
		const len = vNode.children.length;

		// Use classic for loop for best performance
		for (let i = 0; i < len; i++) {
			const child = vNode.children[i];
			if (child == null) continue; // Skip null/undefined quickly

			if (typeof child === "object") {
				fragment.appendChild(createElement(child));
			} else {
				fragment.appendChild(document.createTextNode(String(child)));
			}
		}

		// Single DOM operation for appending all children
		element.appendChild(fragment);
	}

	return element;
}

// Helper function to map React-style prop names to HTML attribute names
// Using a lookup object instead of switch for better performance
function mapPropToAttribute(prop: string): string {
	return PROP_MAP[prop] || prop;
}

// List function that creates reactive nodes from an array signal
export function list<T>(arraySignal: Signal<T[]>, rootSelector: string, mapFn: (item: Signal<T>, index: number) => VNode): VNode[] {
	// Store the current VNodes to return them immediately
	const currentNodes: VNode[] = [];
	const itemSignals: Signal<T>[] = [];
	const initialArray = arraySignal();

	// Pre-allocate for better performance
	const len = initialArray.length;
	itemSignals.length = len;
	currentNodes.length = len;

	// Use document fragment for initial render batch
	const fragment = document.createDocumentFragment();

	// Create signals and nodes in a single pass with classic for-loop
	for (let i = 0; i < len; i++) {
		itemSignals[i] = signal(initialArray[i]);
		currentNodes[i] = mapFn(itemSignals[i], i);
		fragment.appendChild(createElement(currentNodes[i]));
	}

	// Set up subscription to update nodes when array changes
	arraySignal.subscribe((newArray) => {
		const rootElement = document.querySelector(rootSelector);

		// Add all nodes in one DOM operation
		rootElement?.appendChild(fragment);

		if (!rootElement) {
			throw new Error(`Element with selector "${rootSelector}" not found`);
		}
		// Fast lookup map using WeakMap when possible
		const idMap = new Map();
		const len = itemSignals.length;

		// Build ID lookup map from existing signals - O(1) lookups
		for (let i = 0; i < len; i++) {
			const value = itemSignals[i]();
			if (value && typeof value === 'object' && 'id' in value) {
				idMap.set(value.id, itemSignals[i]);
			}
		}

		const newLen = newArray.length;
		const newItemSignals = new Array(newLen);
		const newVNodes = new Array(newLen);
		const newDomNodes = new Array(newLen);

		// Single pass through new array with O(1) lookups
		for (let i = 0; i < newLen; i++) {
			const item = newArray[i];
			let itemSignal;

			// Fast path for items with ID
			if (item && typeof item === 'object' && 'id' in item) {
				// O(1) lookup instead of O(n) search
				itemSignal = idMap.get(item.id);

				if (itemSignal) {
					// Reuse existing signal
					itemSignal.set(item);
					idMap.delete(item.id); // Mark as used
				} else {
					// Create new signal
					itemSignal = signal(item);
				}
			} else {
				// Non-ID items always get new signals
				itemSignal = signal(item);
			}

			newItemSignals[i] = itemSignal;
			newVNodes[i] = mapFn(itemSignal, i);
			newDomNodes[i] = createElement(newVNodes[i]);
		}

		// Get current DOM nodes once before diffing
		const domNodes = Array.from(rootElement.childNodes);

		// Use domdiff to update the DOM efficiently
		domdiff(
			rootElement,
			domNodes,
			newDomNodes,
		);

		// Replace tracking arrays in one operation
		itemSignals.length = 0;
		currentNodes.length = 0;
		Array.prototype.push.apply(itemSignals, newItemSignals);
		Array.prototype.push.apply(currentNodes, newVNodes);
	});

	return currentNodes;
}
