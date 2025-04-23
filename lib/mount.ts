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

// List function that creates reactive nodes from an array signal
export function list<T>(arraySignal: Signal<T[]>, rootSelector: string, mapFn: (item: Signal<T>, index: number) => VNode): VNode[] {
	const currentNodes: VNode[] = [];
	const itemSignals: Signal<T>[] = [];
	const initialArray = arraySignal();

	// Use a single Map for both operations to reduce memory usage
	const idToNodeMap = new Map<any, { node: Node, signal: Signal<T> }>();

	let rootElement: Element | null = null;

	const len = initialArray.length;
	const fragment = document.createDocumentFragment();

	// Pre-allocate arrays to avoid resizing
	itemSignals.length = len;
	currentNodes.length = len;

	for (let i = 0; i < len; i++) {
		const itemSig = signal(initialArray[i]);
		itemSignals[i] = itemSig;
		currentNodes[i] = mapFn(itemSig, i);
		const domNode = createElement(currentNodes[i]);
		fragment.appendChild(domNode);

		// Store both node and signal in a single object to reduce map lookups
		const item = initialArray[i];
		if (item && typeof item === 'object' && 'id' in item) {
			idToNodeMap.set(item.id, { node: domNode, signal: itemSig });
		}
	}

	// Fetch root element once and cache it
	const getRootElement = () => {
		if (!rootElement) {
			rootElement = document.querySelector(rootSelector);
			if (!rootElement) throw new Error(`Element with selector "${rootSelector}" not found`);
		}
		return rootElement;
	};

	arraySignal.subscribe((newArray) => {
		const root = getRootElement();

		if (fragment.firstChild) {
			root.appendChild(fragment);
		}

		// Fast path for empty arrays
		if (newArray.length === 0) {
			root.textContent = ''; // Faster than removing nodes one by one
			itemSignals.length = 0;
			currentNodes.length = 0;
			idToNodeMap.clear();
			return;
		}

		const newLen = newArray.length;
		const newItemSignals: Signal<T>[] = new Array(newLen);
		const newDomNodes: Node[] = new Array(newLen);

		// Use a faster approach to process the array
		for (let i = 0; i < newLen; i++) {
			const item = newArray[i];
			let itemSignal: Signal<T>;

			// Check if we have this item cached by ID
			if (item && typeof item === 'object' && 'id' in item) {
				const cached = idToNodeMap.get(item.id);
				if (cached) {
					cached.signal.set(item);
					newDomNodes[i] = cached.node;
					newItemSignals[i] = cached.signal;
					// Remove from map to track which ones were used
					idToNodeMap.delete(item.id);
					continue;
				}
			}

			// Create new signal and node if not cached
			itemSignal = signal(item);
			newItemSignals[i] = itemSignal;
			const vnode = mapFn(itemSignal, i);
			newDomNodes[i] = createElement(vnode);

			// Cache the new node
			if (item && typeof item === 'object' && 'id' in item) {
				idToNodeMap.set(item.id, { node: newDomNodes[i], signal: itemSignal });
			}
		}

		// Get existing DOM nodes directly - avoid Array.from allocation
		const domNodes: Node[] = [];
		for (let i = 0, len = root.childNodes.length; i < len; i++) {
			domNodes.push(root.childNodes[i]);
		}

		// Apply diff without filtering (all nodes are guaranteed to be non-null)
		domdiff(root, domNodes, newDomNodes);

		// Update tracking arrays efficiently
		itemSignals.length = 0;
		currentNodes.length = 0;
		for (let i = 0; i < newLen; i++) {
			itemSignals[i] = newItemSignals[i];
		}

		// Clear the map for next update
		idToNodeMap.clear();

		// Rebuild the map with new values
		for (let i = 0; i < newLen; i++) {
			const item = newArray[i];
			if (item && typeof item === 'object' && 'id' in item) {
				idToNodeMap.set(item.id, { node: newDomNodes[i], signal: newItemSignals[i] });
			}
		}
	});

	return currentNodes;
}

function getItemId(item: any): any | undefined {
	return item && typeof item === 'object' && 'id' in item ? item.id : undefined;
}

function updateDomNodeMapping<T>(item: any, node: Node, domNodeMap: Map<any, Node>, signalIdMap: Map<any, Signal<T>>, signal?: Signal<any>): void {
	const id = getItemId(item);
	if (id !== undefined) {
		if (signal) {
			signalIdMap.set(id, signal);
		}
		domNodeMap.set(id, node);
	}
}

function detectRowSwap<T>(arr1: T[], arr2: T[]): boolean {
	if (arr1.length !== arr2.length) return false;

	let differences = 0;
	for (let i = 0; i < arr1.length; i++) {
		if (isDifferentItem(arr1[i], arr2[i])) {
			differences++;
			if (differences > 2) return false;
		}
	}

	return differences === 2;
}

function findChangedIndices<T>(arr1: T[], arr2: T[]): number[] {
	const changedIndices = [];
	for (let i = 0; i < arr1.length; i++) {
		if (isDifferentItem(arr1[i], arr2[i])) {
			changedIndices.push(i);
		}
	}
	return changedIndices;
}

function isDifferentItem(item1: any, item2: any): boolean {
	if (item1 === item2) return false;

	const id1 = getItemId(item1);
	const id2 = getItemId(item2);

	if (id1 !== undefined && id2 !== undefined) {
		return id1 !== id2;
	}

	return true;
}

function isItemChanged(item1: any, item2: any): boolean {
	if (item1 === item2) return false;

	if (item1 && item2 && typeof item1 === 'object' && typeof item2 === 'object') {
		const id1 = getItemId(item1);
		const id2 = getItemId(item2);

		if (id1 !== undefined && id2 !== undefined && id1 === id2) {
			for (const key in item2) {
				if (typeof item2[key] !== 'object' && item1[key] !== item2[key]) {
					return true;
				}
			}
		} else {
			return true;
		}
	}

	return JSON.stringify(item1) !== JSON.stringify(item2);
}

// Helper function to update node content without replacing the entire node
function updateNodeContent(oldNode: Element, newNode: Element): void {
	// Update text content for text nodes
	const oldTextNodes = Array.from(oldNode.querySelectorAll('*')).filter(
		el => el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE
	);
	const newTextNodes = Array.from(newNode.querySelectorAll('*')).filter(
		el => el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE
	);

	// Find matching nodes by position/tag and update text
	for (let i = 0; i < oldTextNodes.length && i < newTextNodes.length; i++) {
		if (oldTextNodes[i].tagName === newTextNodes[i].tagName &&
			oldTextNodes[i].textContent !== newTextNodes[i].textContent) {
			oldTextNodes[i].textContent = newTextNodes[i].textContent;
		}
	}

	// Update attributes
	const oldAttributes = oldNode.attributes;
	const newAttributes = newNode.attributes;

	// Remove attributes not in new node
	for (let i = 0; i < oldAttributes.length; i++) {
		const name = oldAttributes[i].name;
		if (!newNode.hasAttribute(name)) {
			oldNode.removeAttribute(name);
		}
	}

	// Set attributes from new node
	for (let i = 0; i < newAttributes.length; i++) {
		const name = newAttributes[i].name;
		const value = newAttributes[i].value;
		if (oldNode.getAttribute(name) !== value) {
			oldNode.setAttribute(name, value);
		}
	}

	// Update class name if changed
	if (oldNode.className !== newNode.className) {
		oldNode.className = newNode.className;
	}
}
