import { type Signal, effect } from "./signal";
import type { EventFn, VNode, VNodeProps, VNodeValue } from "./types";

type ReactiveDom = WeakMap<HTMLElement, WeakMap<Signal<unknown>, Set<unknown>>>;

const reactiveDom: ReactiveDom = new WeakMap();

export function mount(vNode: VNode) {
	const root = document.body;
	root.appendChild(createElement(vNode));
}

function createElement(vNode: VNode) {
	if (typeof vNode === "string" || typeof vNode === "number") {
		return document.createTextNode(String(vNode));
	}

	const element = document.createElement(vNode.type as string);
	const elementMap = reactiveDom.get(element) || new WeakMap();

	const setupSignal = (signal: Signal<any>, key: string) => {
		const signalSet = elementMap.get(signal) || new Set();
		signalSet.add(key);
		elementMap.set(signal, signalSet);
		reactiveDom.set(element, elementMap);

		// Set initial value
		if (key.startsWith("data-")) {
			const dataKey = key.slice(5);
			element.dataset[dataKey] = signal();
		} else {
			(element as any)[key] = signal();
		}

		// Set up subscription immediately
		signal.subscribe((value) => {
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
