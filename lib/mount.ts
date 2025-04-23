import { type Signal, signal } from "./signal";
import type { EventFn, VNode } from "./types";

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

		// Set initial value
		if (key.startsWith("data-")) {
			const dataKey = key.slice(5);
			element.dataset[dataKey] = _signal();
		} else {
			(element as any)[key] = _signal();
		}

		// Set up subscription immediately
		_signal.subscribe((value) => {
			if (key.startsWith("data-")) {
				const dataKey = key.slice(5);
				element.dataset[dataKey] = value;
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

			element.setAttribute(key, value as string);
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

// List function that creates reactive nodes from an array signal
export function list<T>(arraySignal: Signal<T[]>, mapFn: (item: Signal<T>, index: Signal<number>) => VNode): VNode[] {
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
		// Update existing signals or create new ones
		newArray.forEach((item, i) => {
			if (i < itemSignals.length) {
				// Update existing signal
				itemSignals[i].set(item);
				indexSignals[i].set(i);
			} else {
				// Create new signals for new items
				const itemSignal = signal(item);
				const indexSignal = signal(i);

				itemSignals.push(itemSignal);
				indexSignals.push(indexSignal);

				// Add new node
				currentNodes.push(mapFn(itemSignal, indexSignal));
			}
		});

		// Remove extra nodes if array got smaller
		if (newArray.length < itemSignals.length) {
			// Keep only the nodes that correspond to the new array
			currentNodes.length = newArray.length;
			// Don't remove the signals themselves as they might be referenced elsewhere
		}
	});

	return currentNodes;
}
