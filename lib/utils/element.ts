import { computed, signal } from "../signal";
import domdiff from "domdiff";
import type { EventFn, Signal, VNode, VNodeString, WithId, WriteableSignal } from "../types";

// Element with cleanup functions for reactive properties
interface ReactiveElement extends HTMLElement {
	_cleanup?: () => void;
	_cleanups?: Array<() => void>;
}

// Map property names to their DOM attribute equivalents
const PROP_MAP: Record<string, string> = {
	className: "class",
	htmlFor: "for",
};

// Type-safe tracking of reactive DOM elements and their signal dependencies
type ReactiveDom = WeakMap<HTMLElement, WeakMap<Signal<unknown>, Set<string>>>;
const reactiveDom: ReactiveDom = new WeakMap();

/**
 * Creates a DOM element from a virtual node
 * @param vNode - Virtual node, string or number to create element from
 * @returns DOM node
 */
export function createElement(vNode: VNode): Node {
	if (typeof vNode !== "object") return document.createTextNode(String(vNode));

	// Special case for When component
	if (vNode && (vNode as any).__special === "when") {
		const specialNode = vNode as any;
		// Create fragment with comment anchors instead of wrapper span
		const fragment = document.createDocumentFragment();
		const startAnchor = document.createComment(" when-start ");
		const endAnchor = document.createComment(" when-end ");

		fragment.appendChild(startAnchor);
		fragment.appendChild(endAnchor);

		let currentNode: Node | null = null;
		let parent: Node | null = null;

		// Create computed signal for the condition
		const condSignal = computed(() => specialNode.__condition()
			? specialNode.__thenBranch
			: specialNode.__elseBranch || null
		);

		// Subscribe to changes - only runs after fragment is in DOM
		const cleanupFn = condSignal.subscribe((content) => {
			if (!parent) {
				// Find parent once anchors are inserted into DOM
				parent = startAnchor.parentNode;
				if (!parent) return; // Wait until anchors are in DOM
			}

			// Clean up existing content
			if (currentNode) {
				// Clean up any reactive subscriptions
				if ((currentNode as any)._cleanup) {
					(currentNode as any)._cleanup();
				}
				parent.removeChild(currentNode);
				currentNode = null;
			}

			// Insert new content
			if (content) {
				currentNode = createElement(content);
				parent.insertBefore(currentNode, endAnchor);
			}
		});

		// Store cleanup function on start anchor for later access
		(startAnchor as any)._cleanup = () => {
			cleanupFn();
			if (currentNode && (currentNode as any)._cleanup) {
				(currentNode as any)._cleanup();
			}
		};

		// Initial render will be handled after fragment is in DOM
		// We need to manually trigger the first update once parent is available
		queueMicrotask(() => {
			parent = startAnchor.parentNode;
			if (parent) {
				const initialContent = condSignal();
				if (initialContent) {
					currentNode = createElement(initialContent);
					parent.insertBefore(currentNode, endAnchor);
				}
			}
		});

		return fragment;
	}

	// Special case for List component
	if (vNode && (vNode as any).__special === "list") {
		const specialNode = vNode as any;
		const items = specialNode.__items as Signal<any[]>;
		const mapFn = specialNode.__mapFn as (item: WriteableSignal<any>, index: number) => VNode;

		// Create fragment with comment anchors instead of wrapper span
		const fragment = document.createDocumentFragment();
		const startAnchor = document.createComment(" list-start ");
		const endAnchor = document.createComment(" list-end ");

		fragment.appendChild(startAnchor);
		fragment.appendChild(endAnchor);

		const nodes: VNode[] = [];
		const signals: WriteableSignal<any>[] = [];
		const domNodes: Node[] = []; // Track actual DOM nodes
		const domMap = new Map<VNodeString, Node>();
		const signalMap = new Map<VNodeString, WriteableSignal<any>>();
		let initialized = false;
		let parent: Node | null = null;

		// Set up subscription for updates
		const unsubscribe = items.subscribe((newArray) => {
			if (!parent) {
				// Find parent once anchors are inserted into DOM
				parent = startAnchor.parentNode;
				if (!parent) return; // Wait until anchors are in DOM
			}

			// Initial rendering
			if (!initialized) {
				const initial = newArray || [];

				// Create initial nodes
				for (let i = 0; i < initial.length; i++) {
					signals[i] = signal(initial[i]);
					nodes[i] = mapFn(signals[i], i);
					const domNode = createElement(nodes[i]);
					domNodes.push(domNode);
					parent.insertBefore(domNode, endAnchor);

					const id = getItemId(initial[i]);
					if (id !== undefined) {
						domMap.set(id, domNode);
						signalMap.set(id, signals[i]);
					}
				}

				initialized = true;
				return;
			}

			// Special case: empty array
			if (!newArray || !newArray.length) {
				// Remove all child nodes between anchors
				let node = startAnchor.nextSibling;
				while (node && node !== endAnchor) {
					const nextNode = node.nextSibling;

					// Clean up any reactive subscriptions
					if ((node as any)._cleanup) {
						(node as any)._cleanup();
					}

					parent.removeChild(node);
					node = nextNode;
				}

				// Clear tracking arrays and maps
				signals.length = nodes.length = domNodes.length = 0;
				domMap.clear();
				signalMap.clear();
				return;
			}

			// Rest of the list updating logic
			// Simple swap rows case (common in benchmarks)
			if (newArray.length === signals.length) {
				let diffs = 0;
				for (let i = 0; i < signals.length; i++) {
					if (isDifferentItem(signals[i](), newArray[i]) && ++diffs > 2) break;
				}
				if (diffs === 2) {
					const indices: number[] = [];
					for (let i = 0; i < signals.length; i++) {
						if (isDifferentItem(signals[i](), newArray[i])) indices.push(i);
					}
					const [idx1, idx2] = indices;
					const node1 = domNodes[idx1];
					const node2 = domNodes[idx2];
					if (node1 && node2) {
						const placeholder = document.createComment("");
						parent.replaceChild(placeholder, node1);
						parent.replaceChild(node1, node2);
						parent.replaceChild(node2, placeholder);
						signals[idx1].set(newArray[idx1]);
						signals[idx2].set(newArray[idx2]);
						const id1 = getItemId(newArray[idx1]);
						const id2 = getItemId(newArray[idx2]);
						if (id1 !== undefined) {
							domMap.set(id1, node2);
							signalMap.set(id1, signals[idx1]);
						}
						if (id2 !== undefined) {
							domMap.set(id2, node1);
							signalMap.set(id2, signals[idx2]);
						}
						return;
					}
				}
			}

			// Update existing items case
			if (
				newArray.length === signals.length &&
				newArray.every((item, i) => !isDifferentItem(signals[i](), item))
			) {
				const changed: number[] = [];
				for (let i = 0; i < newArray.length; i++) {
					if ((typeof signals[i]() === 'object' && signals[i]() !== null &&
						typeof newArray[i] === 'object' && newArray[i] !== null)
						? shallowDiffers(signals[i]() as object, newArray[i] as object)
						: signals[i]() !== newArray[i]) {
						signals[i].set(newArray[i]);
						changed.push(i);
					}
				}
				for (const i of changed) {
					const domNode = domNodes[i];
					if (domNode) {
						updateNodeContent(
							domNode as Element,
							createElement(mapFn(signals[i], i)) as Element
						);
					}
				}
				return;
			}

			// Full rerender case
			const newSignals = new Array(newArray.length);
			const newNodes = new Array(newArray.length);
			const newDomNodes = new Array(newArray.length);

			for (let i = 0; i < newArray.length; i++) {
				const item = newArray[i];
				const id = getItemId(item);
				const sig = id !== undefined ? signalMap.get(id) : null;
				if (sig && id !== undefined && domMap.get(id)) {
					sig.set(item);
					newDomNodes[i] = domMap.get(id)!;
					newSignals[i] = sig;
					newNodes[i] = nodes[signals.indexOf(sig)];
					domMap.delete(id);
					signalMap.delete(id);
				} else {
					newSignals[i] = signal(item);
					newNodes[i] = mapFn(newSignals[i], i);
					newDomNodes[i] = createElement(newNodes[i]);
					if (id !== undefined) {
						domMap.set(id, newDomNodes[i]);
						signalMap.set(id, newSignals[i]);
					}
				}
			}

			// Get existing nodes between anchors
			const currentChildNodes = [];
			let node = startAnchor.nextSibling;
			while (node && node !== endAnchor) {
				currentChildNodes.push(node);
				node = node.nextSibling;
			}

			// Diff and update the DOM
			domdiff(
				parent,
				currentChildNodes,
				newDomNodes.filter(Boolean),
				{ before: endAnchor }
			);

			// Update tracking arrays
			signals.splice(0, signals.length, ...newSignals);
			nodes.splice(0, nodes.length, ...newNodes);
			domNodes.splice(0, domNodes.length, ...newDomNodes.filter(Boolean));

			// Update ID tracking
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

		// Store cleanup function on start anchor
		(startAnchor as any)._cleanup = () => {
			unsubscribe();

			// Clean up all nodes between anchors
			if (parent) {
				let node = startAnchor.nextSibling;
				while (node && node !== endAnchor) {
					if ((node as any)._cleanup) {
						(node as any)._cleanup();
					}
					node = node.nextSibling;
				}
			}
		};

		return fragment;
	}

	// Special case for signals passed directly - unwrap them
	if (vNode instanceof Function && typeof (vNode as Signal<unknown>).subscribe === 'function') {
		// Create a text node with the signal's current value
		const textNode = document.createTextNode(String((vNode as Signal<unknown>)()));
		// Set up subscription to update the text node
		(vNode as Signal<unknown>).subscribe(value => {
			textNode.textContent = String(value);
		});
		return textNode;
	}

	const { type, props, children } = vNode;
	if (!type) {
		throw new Error('Element type is required');
	}

	const element = document.createElement(type as string) as ReactiveElement;

	// Handle signal as a single child
	if (children?.length === 1) {
		if (children[0] instanceof Function && typeof ((children[0] as Signal<unknown>)).subscribe === 'function') {
			setupSignal(element, (children[0] as Signal<unknown>), "textContent");
			return element;
		}

		// Handle function that returns content (for reactive content)
		if (typeof children[0] === 'function') {
			const contentFn = children[0] as Signal<unknown>;
			// Set initial value
			element.textContent = String(contentFn());
			// Create effect to update content
			const cleanup = contentFn.subscribe(() => {
				element.textContent = String(contentFn());
			});
			// Store cleanup function for later
			element._cleanup = cleanup;
			return element;
		}
	}

	if (props) {
		for (const key in props) {
			const value = props[key];

			// Handle function props specially (for reactive attributes)
			if (typeof value === 'function' && !key.startsWith('on')) {
				// Create effect to update attribute
				const attrFn = value as Signal<unknown>;
				// Set initial value
				const initialValue = attrFn();
				if (key === 'className' || key === 'id' || key === 'textContent') {
					// Handle special properties directly
					setElementProperty(element, key, initialValue);
				} else if (key === 'style' && typeof initialValue === 'object') {
					Object.assign(element.style, initialValue as Partial<CSSStyleDeclaration>);
				} else {
					element.setAttribute(PROP_MAP[key] || key, String(initialValue));
				}

				// Setup effect for updates
				const cleanup = attrFn.subscribe(() => {
					const newValue = attrFn();
					if (key === 'className' || key === 'id' || key === 'textContent') {
						setElementProperty(element, key, newValue);
					} else if (key === 'style' && typeof newValue === 'object') {
						Object.assign(element.style, newValue as Partial<CSSStyleDeclaration>);
					} else {
						element.setAttribute(PROP_MAP[key] || key, String(newValue));
					}
				});

				// Store cleanup function
				element._cleanups = [...(element._cleanups || []), cleanup];
				continue;
			}

			if (key.startsWith("on") && typeof value === "function") {
				element.addEventListener(key.slice(2).toLowerCase(), value as EventFn);
				continue;
			}

			if (value instanceof Function && typeof (value as Signal<unknown>).subscribe === 'function') {
				setupSignal(element, value as Signal<unknown>, key);
				continue;
			}

			if (key === "dataset" && typeof value === "object") {
				for (const dataKey in value) {
					const dataVal = (value as Record<string, unknown>)[dataKey];
					typeof dataVal === "function" && typeof (dataVal as Signal<unknown>).subscribe === 'function'
						? setupSignal(element, dataVal as Signal<unknown>, `data-${dataKey}`)
						: (element.dataset[dataKey] = String(dataVal));
				}
				continue;
			}

			const attrName = PROP_MAP[key] || key;
			// Fast path for common properties
			if (key === 'textContent' || key === 'className' || key === 'id') {
				setElementProperty(element, key, value);
			} else if (key === 'style' && typeof value === 'object') {
				Object.assign(element.style, value as Partial<CSSStyleDeclaration>);
			} else {
				try {
					setElementProperty(element, key, value);
				} catch {
					element.setAttribute(attrName, String(value));
				}
			}
		}
	}

	if (children?.length) {
		const fragment = document.createDocumentFragment();
		for (const child of children) {
			if (child != null) {
				fragment.appendChild(
					typeof child === "object" || typeof child === "function"
						? createElement(child as VNode)
						: document.createTextNode(String(child))
				);
			}
		}
		element.appendChild(fragment);
	}

	return element;
}

/**
 * Sets a property on an HTML element in a type-safe way
 * 
 * @param element - The element to set the property on
 * @param key - The property name
 * @param value - The property value
 */
function setElementProperty<T extends HTMLElement>(element: T, key: string, value: unknown): void {
	if (key in element) {
		// Use type assertion with proper constraints
		(element as unknown as Record<string, unknown>)[key] = value;
	} else {
		// Fallback to setAttribute if direct property setting fails
		element.setAttribute(key, String(value));
	}
}

/**
 * Gets the ID property from an item if it exists
 * 
 * @param item - Item to extract ID from
 * @returns The ID value or undefined
 */
export function getItemId<T>(item: T): VNodeString | undefined {
	return item && typeof item === "object" && "id" in (item as object)
		? ((item as unknown) as WithId).id
		: undefined;
}

/**
 * Determines if two items are different based on their IDs
 * 
 * @param item1 - First item
 * @param item2 - Second item
 * @returns True if items are different, false otherwise
 */
export function isDifferentItem<T>(item1: T, item2: T): boolean {
	if (item1 === item2) return false;
	const id1 = getItemId(item1);
	const id2 = getItemId(item2);
	return id1 !== undefined && id2 !== undefined ? id1 !== id2 : true;
}

/**
 * Performs a shallow comparison of two objects
 * 
 * @param a - First object
 * @param b - Second object
 * @returns True if objects differ, false if identical
 */
export function shallowDiffers<T extends object>(a: T, b: T): boolean {
	if (a === b) return false;

	if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') {
		return true;
	}

	const keysA = Object.keys(a);
	const keysB = Object.keys(b);

	// Quick length check first
	if (keysA.length !== keysB.length) return true;

	// Check if any primitive property differs
	for (let i = 0; i < keysA.length; i++) {
		const key = keysA[i];
		const valueA = (a as Record<string, unknown>)[key];
		const valueB = (b as Record<string, unknown>)[key];

		if (!(key in b) ||
			(typeof valueA !== 'object' && valueA !== valueB)) {
			return true;
		}
	}

	return false;
}

/**
 * Updates the content of an existing DOM node with content from a new one
 * 
 * @param oldNode - Existing node to update
 * @param newNode - New node with updated content
 */
export function updateNodeContent(oldNode: Element, newNode: Element): void {
	const oldTextNodes = Array.from(oldNode.querySelectorAll("*")).filter(
		(el) => el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE
	);
	const newTextNodes = Array.from(newNode.querySelectorAll("*")).filter(
		(el) => el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE
	);

	for (
		let i = 0;
		i < oldTextNodes.length && i < newTextNodes.length;
		i++
	) {
		const oldEl = oldTextNodes[i];
		const newEl = newTextNodes[i];
		if (
			oldEl.tagName === newEl.tagName &&
			oldEl.textContent !== newEl.textContent
		) {
			oldEl.textContent = newEl.textContent;
		}
	}

	for (const attr of Array.from(oldNode.attributes)) {
		if (!newNode.hasAttribute(attr.name)) oldNode.removeAttribute(attr.name);
	}

	for (const attr of Array.from(newNode.attributes)) {
		if (oldNode.getAttribute(attr.name) !== attr.value) {
			oldNode.setAttribute(attr.name, attr.value);
		}
	}

	if (oldNode.className !== newNode.className) {
		oldNode.className = newNode.className;
	}
}

/**
 * Sets up a signal to update an element property/attribute when the signal value changes
 * 
 * @param element - Element to update
 * @param sig - Signal to track
 * @param key - Property/attribute name to update
 */
function setupSignal(element: HTMLElement, sig: Signal<unknown>, key: string): void {
	const elementMap = reactiveDom.get(element) || new WeakMap();
	const signalSet = elementMap.get(sig) || new Set<string>();
	signalSet.add(key);
	elementMap.set(sig, signalSet);
	reactiveDom.set(element, elementMap);

	const attrName = PROP_MAP[key] || key;
	const isDataAttr = key.startsWith("data-");
	const dataKey = isDataAttr ? key.slice(5) : null;

	const setValue = (value: unknown): void => {
		if (isDataAttr && dataKey) {
			element.dataset[dataKey] = String(value);
		} else if (attrName !== key) {
			element.setAttribute(attrName, String(value));
		} else {
			try {
				setElementProperty(element, key, value);
			} catch {
				element.setAttribute(key, String(value));
			}
		}
	};

	setValue(sig());
	sig.subscribe(setValue);
}

/**
 * Retrieves a DOM element using the provided CSS selector.
 *
 * @param rootSelector - CSS selector string to identify the target DOM element
 * @returns The DOM element that matches the specified selector
 * @throws Error When the selector is not a string or when no matching element is found
 */
export function getRootElement(rootSelector?: string): HTMLElement {
	// Throw if rootSelector not a string
	if (typeof rootSelector !== "string") {
		throw new Error(`rootSelector must be a string, received: ${typeof rootSelector}`);
	}
	// Get the root element
	const rootElement = document.querySelector(rootSelector);
	// Throw if root element not found
	if (!rootElement) {
		console.warn(`No element found for selector: ${rootSelector}`);
	}
	return rootElement as HTMLElement;
}

/**
 *	Checks if the provided virtual node (vNode) is a text node.
 *
 * @param value - The virtual node to check
 *
 * @returns True if the vNode is a text node (string or number), false otherwise
 */
export function isVNodeString(value: unknown): boolean {
	return typeof value === "string" || typeof value === "number";
}