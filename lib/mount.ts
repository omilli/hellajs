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

	const domNodeMap = new Map<any, Node>();
	const signalIdMap = new Map<any, Signal<T>>();

	let rootElement: Element | null = null;

	const len = initialArray.length;
	itemSignals.length = len;
	currentNodes.length = len;

	const fragment = document.createDocumentFragment();

	for (let i = 0; i < len; i++) {
		itemSignals[i] = signal(initialArray[i]);
		currentNodes[i] = mapFn(itemSignals[i], i);
		const domNode = createElement(currentNodes[i]);
		fragment.appendChild(domNode);

		const item = initialArray[i];
		if (item && typeof item === 'object' && 'id' in item) {
			domNodeMap.set(item.id, domNode);
			signalIdMap.set(item.id, itemSignals[i]);
		}
	}

	const getRootElement = () => {
		if (!rootElement) {
			rootElement = document.querySelector(rootSelector);
			if (!rootElement) {
				throw new Error(`Element with selector "${rootSelector}" not found`);
			}
		}
		return rootElement;
	};

	arraySignal.subscribe((newArray) => {
		const root = getRootElement();

		if (fragment.firstChild) {
			root.appendChild(fragment);
		}

		if (newArray.length === 0) {
			while (root.firstChild) {
				root.removeChild(root.firstChild);
			}

			itemSignals.length = 0;
			currentNodes.length = 0;
			domNodeMap.clear();
			signalIdMap.clear();
			return;
		}

		if (newArray.length === itemSignals.length && detectRowSwap(itemSignals.map(s => s()), newArray)) {
			const changes = findChangedIndices(itemSignals.map(s => s()), newArray);
			if (changes.length === 2) {
				const [idx1, idx2] = changes;
				const node1 = root.childNodes[idx1];
				const node2 = root.childNodes[idx2];

				if (node1 && node2) {
					const placeholder = document.createComment('');
					root.replaceChild(placeholder, node1);
					root.replaceChild(node1, node2);
					root.replaceChild(node2, placeholder);

					itemSignals[idx1].set(newArray[idx1]);
					itemSignals[idx2].set(newArray[idx2]);

					updateDomNodeMapping(newArray[idx1], node2, domNodeMap, signalIdMap, signalIdMap.get(getItemId(newArray[idx1])));
					updateDomNodeMapping(newArray[idx2], node1, domNodeMap, signalIdMap, signalIdMap.get(getItemId(newArray[idx2])));
					return;
				}
			}
		}

		if (newArray.length === itemSignals.length &&
			newArray.every((item, i) => {
				const currItem = itemSignals[i]();
				return !isDifferentItem(currItem, item);
			})) {

			let hasChanges = false;
			const changedIndices = [];

			// First pass: identify which items changed and update signals
			for (let i = 0; i < newArray.length; i++) {
				const currItem = itemSignals[i]();
				const newItem = newArray[i];

				if (isItemChanged(currItem, newItem)) {
					itemSignals[i].set(newItem);
					changedIndices.push(i);
					hasChanges = true;
				}
			}

			// If nothing changed, we can truly skip
			if (!hasChanges) return;

			// Second pass: update the DOM nodes for changed items only
			for (let i = 0; i < changedIndices.length; i++) {
				const index = changedIndices[i];
				const domNode = root.childNodes[index];

				if (domNode) {
					// Handle text content updates (like labels) directly
					const newNodeContent = createElement(mapFn(itemSignals[index], index));

					// Use a targeted update approach - much faster than full diffing
					updateNodeContent(domNode as Element, newNodeContent as Element);
				}
			}
			return;
		}

		const newLen = newArray.length;
		const newItemSignals = new Array(newLen);
		const newVNodes = new Array(newLen);
		const newDomNodes = new Array(newLen);

		for (let i = 0; i < newLen; i++) {
			const item = newArray[i];
			const id = getItemId(item);
			let itemSignal;

			if (id !== undefined) {
				itemSignal = signalIdMap.get(id);

				if (itemSignal) {
					itemSignal.set(item);

					const existingDomNode = domNodeMap.get(id);
					if (existingDomNode) {
						newDomNodes[i] = existingDomNode;
						signalIdMap.delete(id);
						domNodeMap.delete(id);

						newItemSignals[i] = itemSignal;
						newVNodes[i] = currentNodes[itemSignals.indexOf(itemSignal)];
						continue;
					}
				}
			}

			itemSignal = signal(item);
			newItemSignals[i] = itemSignal;
			newVNodes[i] = mapFn(itemSignal, i);
			newDomNodes[i] = createElement(newVNodes[i]);

			if (id !== undefined) {
				domNodeMap.set(id, newDomNodes[i]);
				signalIdMap.set(id, itemSignal);
			}
		}

		const domNodes = Array.from(root.childNodes);

		domdiff(root, domNodes, newDomNodes.filter(Boolean));

		itemSignals.length = 0;
		currentNodes.length = 0;
		Array.prototype.push.apply(itemSignals, newItemSignals);
		Array.prototype.push.apply(currentNodes, newVNodes);

		domNodeMap.clear();
		signalIdMap.clear();

		for (let i = 0; i < newLen; i++) {
			const id = getItemId(newArray[i]);
			if (id !== undefined) {
				domNodeMap.set(id, newDomNodes[i]);
				signalIdMap.set(id, newItemSignals[i]);
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
