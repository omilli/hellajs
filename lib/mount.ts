import { type Signal, signal } from "./signal";
import type { EventFn, VNode } from "./types";
import domdiff from 'domdiff';
import { getRootElement } from "./utils/dom";

type ReactiveDom = WeakMap<HTMLElement, WeakMap<Signal<unknown>, Set<string>>>;

const reactiveDom: ReactiveDom = new WeakMap();
const PROP_MAP: Record<string, string> = {
	className: "class",
	htmlFor: "for",
};

export function mount(vNode: VNode, rootSelector?: string) {
	getRootElement(rootSelector).appendChild(createElement(vNode));
}

function createElement(vNode: VNode): Node {
	if (typeof vNode !== "object") return document.createTextNode(String(vNode));

	const { type, props, children } = vNode;
	const element = document.createElement(type as string);

	if (children?.[0] instanceof Function) {
		setupSignal(element, children[0] as Signal<any>, "textContent");
	}

	if (props) {
		for (const key in props) {
			const value = props[key];

			if (key.startsWith("on") && typeof value === "function") {
				element.addEventListener(key.slice(2).toLowerCase(), value as EventFn);
				continue;
			}

			if (value instanceof Function) {
				setupSignal(element, value as Signal<unknown>, key);
				continue;
			}

			if (key === "dataset" && typeof value === "object") {
				for (const dataKey in value) {
					const dataVal = (value as Record<string, string>)[dataKey];
					typeof dataVal === "function"
						? setupSignal(element, dataVal as Signal<unknown>, `data-${dataKey}`)
						: (element.dataset[dataKey] = dataVal);
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
					element.setAttribute(attrName, value as string);
				}
			}
		}
	}

	if (children?.length) {
		const fragment = document.createDocumentFragment();
		for (const child of children) {
			if (child != null) {
				fragment.appendChild(
					typeof child === "object"
						? createElement(child)
						: document.createTextNode(String(child))
				);
			}
		}
		element.appendChild(fragment);
	}

	return element;
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

export function list<T>(
	arraySignal: Signal<T[]>,
	rootSelector: string,
	mapFn: (item: Signal<T>, index: number) => VNode
): VNode[] {
	const nodes: VNode[] = [];
	const signals: Signal<T>[] = [];
	const initial = arraySignal();
	const domMap = new Map<any, Node>();
	const signalMap = new Map<any, Signal<T>>();

	const fragment = document.createDocumentFragment();
	for (let i = 0; i < initial.length; i++) {
		signals[i] = signal(initial[i]);
		nodes[i] = mapFn(signals[i], i);
		const domNode = createElement(nodes[i]);
		fragment.appendChild(domNode);
		const id = getItemId(initial[i]);
		if (id !== undefined) {
			domMap.set(id, domNode);
			signalMap.set(id, signals[i]);
		}
	}

	arraySignal.subscribe((newArray) => {
		const root = getRootElement(rootSelector);
		if (fragment.firstChild) {
			root.appendChild(fragment);
		}

		if (!newArray.length) {
			root.replaceChildren();
			signals.length = nodes.length = 0;
			domMap.clear();
			signalMap.clear();
			return;
		}

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
				const node1 = root.childNodes[idx1];
				const node2 = root.childNodes[idx2];
				if (node1 && node2) {
					const placeholder = document.createComment("");
					root.replaceChild(placeholder, node1);
					root.replaceChild(node1, node2);
					root.replaceChild(node2, placeholder);
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

		if (
			newArray.length === signals.length &&
			newArray.every((item, i) => !isDifferentItem(signals[i](), item))
		) {
			const changed: number[] = [];
			for (let i = 0; i < newArray.length; i++) {
				if (shallowDiffers(signals[i](), newArray[i])) {
					signals[i].set(newArray[i]);
					changed.push(i);
				}
			}
			for (const i of changed) {
				const domNode = root.childNodes[i];
				if (domNode) {
					updateNodeContent(
						domNode as Element,
						createElement(mapFn(signals[i], i)) as Element
					);
				}
			}
			return;
		}

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

		domdiff(root, Array.from(root.childNodes), newDomNodes.filter(Boolean));
		signals.splice(0, signals.length, ...newSignals);
		nodes.splice(0, nodes.length, ...newNodes);
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

	return nodes;
}

function getItemId(item: any): any | undefined {
	return item && typeof item === "object" && "id" in item ? item.id : undefined;
}

function isDifferentItem(item1: any, item2: any): boolean {
	if (item1 === item2) return false;
	const id1 = getItemId(item1);
	const id2 = getItemId(item2);
	return id1 !== undefined && id2 !== undefined ? id1 !== id2 : true;
}

// A more performant shallow comparison function
function shallowDiffers(a: any, b: any): boolean {
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

function updateNodeContent(oldNode: Element, newNode: Element): void {
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