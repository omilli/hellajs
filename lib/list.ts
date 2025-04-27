import domdiff from "domdiff";
import {
	createElement,
	getItemId,
	isDifferentItem,
	shallowDiffers,
	updateElement,
} from "./dom";
import { cleanup } from "./render";
import { signal } from "./signal";
import type {
	Signal,
	SignalUnsubscribe,
	VNode,
	VNodeFlatFn,
	VNodeString,
	WriteableSignal,
} from "./types";
import { isObject } from "./utils";
import { html } from "./html";

/**
 * Helper function to determine if DOM updates are necessary
 */
function shouldUpdateNode(oldVNode: VNode, newVNode: VNode): boolean {
	// If types differ, update is needed
	if (oldVNode.type !== newVNode.type) return true;

	// Compare props that affect rendering
	const oldProps = oldVNode.props || {};
	const newProps = newVNode.props || {};

	// Quick comparison of all props
	for (const key in newProps) {
		if (oldProps[key] !== newProps[key]) {
			return true;
		}
	}

	// Check children length
	const oldChildren = oldVNode.children || [];
	const newChildren = newVNode.children || [];

	if (oldChildren.length !== newChildren.length) {
		return true;
	}

	// Compare text content of children
	for (let i = 0; i < oldChildren.length; i++) {
		if (typeof oldChildren[i] === 'string' &&
			oldChildren[i] !== newChildren[i]) {
			return true;
		}
	}

	return false; // No visual differences detected
}

/**
 * Helper function to update node and its VNode reference
 */
function updateNodeAndVNode<T>(
	node: Node,
	index: number | VNodeString,
	oldVNode: VNode,
	newVNode: VNode,
	nodeMap: Map<string | number, Node>,
	vnodeMap: Map<string | number, VNode>,
	rootSelector: string
): void {
	if (oldVNode.type === newVNode.type) {
		updateElement(node as HTMLElement, oldVNode, newVNode);
	} else {
		// For different element types, do full replacement
		const newNode = createElement(newVNode, rootSelector);
		if (node.parentNode) {
			node.parentNode.replaceChild(newNode, node);
		}
		nodeMap.set(index, newNode);
	}
	vnodeMap.set(index, newVNode);
}

/**
 * Creates a reactive list with fluent API.
 * Use the map method to transform items into VNodes.
 *
 * @param state - State object containing items array and optional additional signals
 * @returns Object with map method to define item rendering
 */
export function List<T, S extends Record<string, Signal<unknown>> = Record<string, Signal<unknown>>>(state: S & { items: WriteableSignal<T[]> }) {
	let unsubscribe: SignalUnsubscribe = () => { };
	let initialized = false;
	let parentID: string;
	let rootSelector: string;
	let rootElement: HTMLElement | null = null;
	const nodeMap = new Map<string | number, Node>();
	const vnodeMap = new Map<string | number, VNode>();

	return {
		map(mapFn: (item: WriteableSignal<T>, state: S) => VNode): VNodeFlatFn {
			const signals: WriteableSignal<T>[] = [];
			const domMap = new Map<VNodeString, Node>();
			const signalMap = new Map<VNodeString, WriteableSignal<T>>();

			// Create flat function that will be called during rendering
			const fn = () => {
				parentID = ((fn as VNodeFlatFn)._parent as string) || Math.random().toString(36).substring(4);
				rootSelector = (fn as VNodeFlatFn).rootSelector as string;

				// Create container if no parent was provided
				if (!(fn as VNodeFlatFn)._parent) {
					return html.Div({ id: parentID });
				}
			};

			fn._flatten = true;

			// Setup item signal subscription for efficiently handling updates
			function setupItemSubscription(itemSignal: WriteableSignal<T>, index: number): void {
				itemSignal.subscribe(() => {
					const existingNode = nodeMap.get(index);
					if (existingNode && existingNode.isConnected) {
						const newVNode = mapFn(itemSignal, state);
						const oldVNode = vnodeMap.get(index);

						if (oldVNode) {
							updateNodeAndVNode(
								existingNode,
								index,
								oldVNode,
								newVNode,
								nodeMap,
								vnodeMap,
								rootSelector
							);

							// Update id-based references if applicable
							const id = getItemId(itemSignal());
							if (id !== undefined) {
								nodeMap.set(id, existingNode);
								domMap.set(id, existingNode);
							}
						}
					}
				});
			}

			// Handle initial render or complete rerender
			function renderInitial(items: T[]): void {
				const fragment = document.createDocumentFragment();

				for (let i = 0; i < items.length; i++) {
					const itemSignal = signal(items[i]);
					signals[i] = itemSignal;

					// Generate VNode and create DOM element
					const vnode = mapFn(itemSignal, state);
					vnodeMap.set(i, vnode);
					setupItemSubscription(itemSignal, i);

					const domNode = createElement(vnode, rootSelector);
					fragment.appendChild(domNode);

					// Store references
					nodeMap.set(i, domNode);
					const id = getItemId(items[i]);
					if (id !== undefined) {
						nodeMap.set(id, domNode);
						domMap.set(id, domNode);
						signalMap.set(id, itemSignal);
						vnodeMap.set(id, vnode);
					}
				}

				rootElement!.appendChild(fragment);
				initialized = true;
			}

			// Main items subscription
			unsubscribe = state.items.subscribe((newArray) => {
				rootElement ??= document.getElementById(parentID);
				if (!rootElement) return;

				// Handle empty array
				if (!newArray?.length) {
					rootElement.replaceChildren();
					signals.length = 0;
					domMap.clear();
					signalMap.clear();
					nodeMap.clear();
					vnodeMap.clear();
					return;
				}

				// Initial render
				if (!initialized) {
					renderInitial(newArray);
					return;
				}

				// Check if we can update in-place (same items, just changed values)
				const canUpdateInPlace = newArray.length === signals.length &&
					newArray.every((item, i) => !isDifferentItem(signals[i](), item));

				if (canUpdateInPlace) {
					// Simple value updates - the signal subscriptions will handle DOM updates
					for (let i = 0; i < newArray.length; i++) {
						const currentValue = signals[i]();
						const newValue = newArray[i];

						if (currentValue !== newValue) {
							// Update signal for objects or primitives
							if (isObject(currentValue) && isObject(newValue) &&
								currentValue !== null && newValue !== null) {
								if (shallowDiffers(currentValue, newValue)) {
									signals[i].set(newValue);
								}
							} else if (!isObject(currentValue) || !isObject(newValue)) {
								signals[i].set(newValue);
							}
						}
					}
					return;
				}

				// Full rerender with node reuse
				const newDomNodes = new Array(newArray.length);
				const newSignals = new Array(newArray.length);
				const itemMap = new Map();

				// Identify reusable nodes by ID
				for (let i = 0; i < newArray.length; i++) {
					const id = getItemId(newArray[i]);
					if (id !== undefined && domMap.has(id)) {
						itemMap.set(id, {
							index: i,
							signal: signalMap.get(id)!,
							node: domMap.get(id)!,
						});
					}
				}

				// Process all items (reusing or creating as needed)
				for (let i = 0; i < newArray.length; i++) {
					const item = newArray[i];
					const id = getItemId(item);
					const reusableItem = id !== undefined ? itemMap.get(id) : null;

					if (reusableItem) {
						// Reuse existing node
						reusableItem.signal.set(item);
						newDomNodes[i] = reusableItem.node;
						newSignals[i] = reusableItem.signal;
						domMap.delete(id as VNodeString);
						signalMap.delete(id as VNodeString);
					} else {
						// Create new node
						const itemSignal = signal(item);
						setupItemSubscription(itemSignal, i);
						newSignals[i] = itemSignal;

						const vnode = mapFn(itemSignal, state);
						vnodeMap.set(i, vnode);
						newDomNodes[i] = createElement(vnode, rootSelector);

						if (id !== undefined) {
							domMap.set(id, newDomNodes[i]);
							signalMap.set(id, itemSignal);
						}
					}

					// Update index references
					nodeMap.set(i, newDomNodes[i]);
					if (id !== undefined) {
						nodeMap.set(id, newDomNodes[i]);
					}
				}

				// Update DOM efficiently
				domdiff(rootElement, Array.from(rootElement.childNodes), newDomNodes);

				// Update tracking state
				signals.splice(0, signals.length, ...newSignals);

				// Reset ID-based maps
				domMap.clear();
				signalMap.clear();
				for (let i = 0; i < newArray.length; i++) {
					const id = getItemId(newArray[i]);
					if (id !== undefined) {
						domMap.set(id, newDomNodes[i]);
						signalMap.set(id, newSignals[i]);
					}
				}
			});

			// Subscribe to other state signals for dependency tracking
			for (let sig in state) {
				if (sig === "items") continue;
				state[sig].subscribe(() => {
					if (!initialized || !rootElement) return;

					// Only update visible nodes when state changes
					for (let i = 0; i < signals.length; i++) {
						const node = nodeMap.get(i);
						if (!node || !node.isConnected) continue;

						const oldVNode = vnodeMap.get(i);
						if (oldVNode) {
							const newVNode = mapFn(signals[i], state);
							// Only update if rendering actually changed
							if (shouldUpdateNode(oldVNode, newVNode)) {
								updateElement(node as HTMLElement, oldVNode, newVNode);
								vnodeMap.set(i, newVNode);
							}
						}
					}
				});
			}

			return fn as VNodeFlatFn;
		},
		cleanup: () => {
			unsubscribe();
			nodeMap.clear();
			vnodeMap.clear();

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
