import domdiff from "domdiff";
import {
	createElement,
	getItemId,
	isDifferentItem,
	shallowDiffers,
} from "./dom";
import { cleanup } from "./render";
import { signal } from "./signal";
import type {
	ReadonlySignal,
	SignalUnsubscribe,
	VNode,
	VNodeFlatFn,
	VNodeString,
	WriteableSignal,
} from "./types";
import { isObject } from "./utils";

// Pure utility functions
function getRandom() {
	return Math.random().toString(36).substring(4);
}

function isNeedingUpdate<T>(current: T, next: T): boolean {
	if (
		isObject(current) &&
		current !== null &&
		isObject(next) &&
		next !== null
	) {
		return shallowDiffers(current as object, next as object);
	}
	return current !== next;
}

function storeItemReferences<T>(
	item: T,
	index: number,
	node: Node,
	itemSignal: WriteableSignal<T>,
	nodeMap: Map<string | number, Node>,
	idMap: Map<VNodeString, Node>,
	sigMap: Map<VNodeString, WriteableSignal<T>>,
) {
	nodeMap.set(index, node);
	const id = getItemId(item);
	if (id !== undefined) {
		nodeMap.set(id, node);
		idMap.set(id, node);
		sigMap.set(id, itemSignal);
	}
}

function canUpdateArrayInPlace<T>(items: T[], signals: WriteableSignal<T>[]) {
	return (
		items.length === signals.length &&
		items.every((item, i) => !isDifferentItem(signals[i](), item))
	);
}

/**
 * Creates a reactive list with fluent API.
 * Use the map method to transform items into VNodes.
 *
 * @param items - Signal containing an array of items
 * @returns Object with map method to define item rendering
 */
export function List<T>(items: ReadonlySignal<T[]>) {
	let unsubscribe: SignalUnsubscribe = () => {};
	let initialized = false;
	let parentID: string;
	let rootSelector: string;
	let rootElement: HTMLElement | null = null;
	const nodeMap = new Map<string | number, Node>();

	return {
		map(
			mapFn: (item: WriteableSignal<T>, index: number) => VNode,
		): VNodeFlatFn {
			const nodes: VNode[] = [];
			const signals: WriteableSignal<T>[] = [];
			const domMap = new Map<VNodeString, Node>();
			const signalMap = new Map<VNodeString, WriteableSignal<T>>();

			const fn = () => {
				parentID = ((fn as VNodeFlatFn)._parent as string) || getRandom();
				rootSelector = (fn as VNodeFlatFn).rootSelector as string;
			};

			fn._flatten = true;

			unsubscribe = items.subscribe((newArray) => {
				rootElement = document.getElementById(parentID);
				if (!rootElement) return;

				// Main control flow
				if (!newArray?.length) {
					// Handle empty array
					rootElement.replaceChildren();
					signals.length = nodes.length = 0;
					domMap.clear();
					signalMap.clear();
					nodeMap.clear();
					return;
				}

				if (!initialized) {
					// Initial render
					const fragment = document.createDocumentFragment();

					for (let i = 0; i < newArray.length; i++) {
						signals[i] = signal(newArray[i]);
						nodes[i] = mapFn(signals[i], i);
						const domNode = createElement(nodes[i], rootSelector);
						fragment.appendChild(domNode);

						storeItemReferences(
							newArray[i],
							i,
							domNode,
							signals[i],
							nodeMap,
							domMap,
							signalMap,
						);
					}

					rootElement.appendChild(fragment);
					initialized = true;
					return;
				}

				if (canUpdateArrayInPlace(newArray, signals)) {
					// Update in place (no reordering)
					for (let i = 0; i < newArray.length; i++) {
						const currentValue = signals[i]();
						const newValue = newArray[i];

						if (isNeedingUpdate(currentValue, newValue)) {
							signals[i].set(newValue);
						}
					}
					return;
				}

				let itemRef;

				// Full rerender with node reuse
				const newDomNodes = new Array(newArray.length);
				const newSignals = new Array(newArray.length);
				const itemMap = new Map(); // Track {id -> {index, signal, node}}

				// First pass: identify reusable nodes and mark items for reuse
				for (let i = 0; i < newArray.length; i++) {
					const item = newArray[i];
					const id = getItemId(item);

					if (id !== undefined && domMap.has(id)) {
						// Track for reuse
						itemMap.set(id, {
							index: i,
							signal: signalMap.get(id)!,
							node: domMap.get(id)!,
						});
					}
				}

				// Second pass: process all items (reusing or creating as needed)
				for (let i = 0; i < newArray.length; i++) {
					const item = newArray[i];
					const id = getItemId(item);
					const reusableItem = id !== undefined ? itemMap.get(id) : null;

					if (reusableItem) {
						// Reuse existing node
						reusableItem.signal.set(item);
						newDomNodes[i] = reusableItem.node;
						newSignals[i] = reusableItem.signal;
						// Remove from maps to mark as processed
						domMap.delete(id as VNodeString);
						signalMap.delete(id as VNodeString);
					} else {
						// Create new node
						const itemSignal = signal(item);
						newSignals[i] = itemSignal;
						newDomNodes[i] = createElement(mapFn(itemSignal, i), rootSelector);

						// Store reference for future reuse
						if (id !== undefined) {
							domMap.set(id, newDomNodes[i]);
							signalMap.set(id, itemSignal);
						}
					}

					// Keep index-based reference
					nodeMap.set(i, newDomNodes[i]);
					if (id !== undefined) {
						nodeMap.set(id, newDomNodes[i]);
					}
				}

				// Update DOM efficiently
				domdiff(rootElement, Array.from(rootElement.childNodes), newDomNodes);

				// Update tracking state
				signals.splice(0, signals.length, ...newSignals);

				// Clear any unused item references
				domMap.clear();
				signalMap.clear();

				// Reset maps with new items
				for (let i = 0; i < newArray.length; i++) {
					const item = newArray[i];
					const id = getItemId(item);
					if (id !== undefined) {
						domMap.set(id, newDomNodes[i]);
						signalMap.set(id, newSignals[i]);
					}
				}
			});

			return fn as VNodeFlatFn;
		},
		cleanup: () => {
			unsubscribe();
			nodeMap.clear();

			if (initialized && rootElement) {
				try {
					Array.from(rootElement.childNodes).forEach(cleanup);
				} catch (e) {
					// Ignore errors if root element is gone
				}
			}
		},
	};
}
