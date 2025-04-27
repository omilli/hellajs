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

/**
 * Creates a reactive list with fluent API.
 * Use the map method to transform items into VNodes.
 *
 * @param items - Signal containing an array of items
 * @returns Object with map method to define item rendering
 */
export function List<T>(items: ReadonlySignal<T[]>) {
	let unsubscribe: SignalUnsubscribe = () => { };
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
				parentID = ((fn as VNodeFlatFn)._parent as string) || Math.random().toString(36).substring(4);
				rootSelector = (fn as VNodeFlatFn).rootSelector as string;
			};

			fn._flatten = true;

			unsubscribe = items.subscribe((newArray) => {
				rootElement ??= document.getElementById(parentID);
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

						nodeMap.set(i, domNode);
						const id = getItemId(newArray[i]);
						if (id !== undefined) {
							nodeMap.set(id, domNode);
							domMap.set(id, domNode);
							signalMap.set(id, signals[i]);
						}
					}

					rootElement.appendChild(fragment);
					initialized = true;
					return;
				}

				const canUpdateArrayInPlace = newArray.length === signals.length &&
					newArray.every((item, i) => !isDifferentItem(signals[i](), item));

				if (canUpdateArrayInPlace) {
					// Update in place (no reordering)
					for (let i = 0; i < newArray.length; i++) {
						const currentValue = signals[i]();
						const newValue = newArray[i];

						let isNeedingUpdate = false;

						if (
							isObject(currentValue) &&
							currentValue !== null &&
							isObject(newValue) &&
							newValue !== null
						) {
							isNeedingUpdate = shallowDiffers(currentValue, newValue);
						} else {
							isNeedingUpdate = currentValue !== newValue;
						}


						if (isNeedingUpdate) {
							signals[i].set(newValue);
						}
					}
					return;
				}

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