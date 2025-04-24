import type { EventFn, Signal, VNode } from "./types";

type ReactiveDom = WeakMap<HTMLElement, WeakMap<Signal<any>, Set<string>>>;

const reactiveDom: ReactiveDom = new WeakMap();
const PROP_MAP: Record<string, string> = {
	className: "class",
	htmlFor: "for",
};

export function createElement(vNode: VNode): Node {
	if (typeof vNode !== "object") return document.createTextNode(String(vNode));

	// Special case for signals passed directly - unwrap them
	if (vNode instanceof Function && typeof (vNode as Signal<any>).subscribe === 'function') {
		// Create a text node with the signal's current value
		const textNode = document.createTextNode(String((vNode as Signal<any>)()));
		// Set up subscription to update the text node
		(vNode as Signal<any>).subscribe(value => {
			textNode.textContent = String(value);
		});
		return textNode;
	}

	const { type, props, children } = vNode;
	const element = document.createElement(type as string);

	// Handle signal as a single child
	if (children?.length === 1) {
		if (children[0] instanceof Function && typeof ((children[0] as Signal<any>)).subscribe === 'function') {
			setupSignal(element, (children[0] as Signal<any>), "textContent");
			return element;
		}

		// Handle function that returns content (for reactive content)
		if (typeof children[0] === 'function') {
			const contentFn = children[0] as Signal<any>;
			// Set initial value
			element.textContent = String(contentFn());
			// Create effect to update content
			const cleanup = contentFn.subscribe(() => {
				element.textContent = String(contentFn());
			});
			// Store cleanup function for later
			(element as any)._cleanup = cleanup;
			return element;
		}
	}

	if (props) {
		for (const key in props) {
			const value = props[key];

			// Handle function props specially (for reactive attributes)
			if (typeof value === 'function' && !key.startsWith('on')) {
				// Create effect to update attribute
				const attrFn = value as Signal<any>;
				// Set initial value
				const initialValue = attrFn();
				if (key === 'className' || key === 'id' || key === 'textContent') {
					(element as any)[key] = initialValue;
				} else if (key === 'style' && typeof initialValue === 'object') {
					Object.assign(element.style, initialValue);
				} else {
					element.setAttribute(PROP_MAP[key] || key, String(initialValue));
				}

				// Setup effect for updates
				const cleanup = attrFn.subscribe(() => {
					const newValue = attrFn();
					if (key === 'className' || key === 'id' || key === 'textContent') {
						(element as any)[key] = newValue;
					} else if (key === 'style' && typeof newValue === 'object') {
						Object.assign(element.style, newValue);
					} else {
						element.setAttribute(PROP_MAP[key] || key, String(newValue));
					}
				});

				// Store cleanup function
				(element as any)._cleanups = [...((element as any)._cleanups || []), cleanup];
				continue;
			}

			if (key.startsWith("on") && typeof value === "function") {
				element.addEventListener(key.slice(2).toLowerCase(), value as EventFn);
				continue;
			}

			if (value instanceof Function && typeof (value as Signal<any>).subscribe === 'function') {
				setupSignal(element, value as Signal<unknown>, key);
				continue;
			}

			if (key === "dataset" && typeof value === "object") {
				for (const dataKey in value) {
					const dataVal = (value as Record<string, string>)[dataKey];
					typeof dataVal === "function" && typeof (dataVal as Signal<any>).subscribe === 'function'
						? setupSignal(element, dataVal as Signal<unknown>, `data-${dataKey}`)
						: (element.dataset[dataKey] = String(dataVal));
				}
				continue;
			}

			const attrName = PROP_MAP[key] || key;
			// Fast path for common properties
			if (key === 'textContent' || key === 'className' || key === 'id') {
				(element as any)[key] = value;
			} else if (key === 'style' && typeof value === 'object') {
				Object.assign(element.style, value);
			} else {
				try {
					(element as any)[key] = value;
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
						? createElement(child)
						: document.createTextNode(String(child))
				);
			}
		}
		element.appendChild(fragment);
	}

	return element;
}

export function getItemId(item: any): any | undefined {
	return item && typeof item === "object" && "id" in item ? item.id : undefined;
}

export function isDifferentItem(item1: any, item2: any): boolean {
	if (item1 === item2) return false;
	const id1 = getItemId(item1);
	const id2 = getItemId(item2);
	return id1 !== undefined && id2 !== undefined ? id1 !== id2 : true;
}

// A more performant shallow comparison function
export function shallowDiffers(a: any, b: any): boolean {
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
		const valueA = a[key];
		const valueB = b[key];

		if (!(key in b) ||
			(typeof valueA !== 'object' && valueA !== valueB)) {
			return true;
		}
	}

	return false;
}

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

function setupSignal(element: HTMLElement, sig: Signal<any>, key: string) {
	const elementMap = reactiveDom.get(element) || new WeakMap();
	const signalSet = elementMap.get(sig) || new Set<string>();
	signalSet.add(key);
	elementMap.set(sig, signalSet);
	reactiveDom.set(element, elementMap);

	const attrName = PROP_MAP[key] || key;
	const isDataAttr = key.startsWith("data-");
	const dataKey = isDataAttr ? key.slice(5) : null;

	const setValue = (value: any) => {
		if (isDataAttr) {
			element.dataset[dataKey!] = value;
		} else if (attrName !== key) {
			element.setAttribute(attrName, value);
		} else {
			try {
				(element as any)[key] = value;
			} catch {
				element.setAttribute(key, value);
			}
		}
	};

	setValue(sig());
	sig.subscribe(setValue);
}