import type {
	HTMLElementFactory,
	HTMLElementProxy,
	HTMLTagCache,
	HTMLTagName,
	VNode,
	VNodeProps,
	VNodeValue,
} from "./types";
import { isVNodeString } from "./utils/dom";

const baseObject: HTMLTagCache = {
	$: (...args: VNodeValue[]): VNode => {
		const children = args
			.flat(Number.POSITIVE_INFINITY)
			.map((child) =>
				isVNodeString(child) ? String(child) : (child as VNode),
			);
		return { children };
	},
};

/**
 * A proxy object that dynamically creates HTML element functions.
 *
 * When accessing a property on this object:
 * - If the property starts with "__" or is not a string, it returns the property from the base object.
 * - If the property exists in the base object, it returns that property.
 * - Otherwise, it creates a new element function for the HTML tag name represented by the property,
 *   caches it in the base object, and returns the function.
 *
 */
export const html = new Proxy(baseObject, {
	get: (target, prop: string | symbol) => {
		if (typeof prop !== "string" || prop.startsWith("__")) {
			return Reflect.get(target, prop, target);
		}

		if (prop in target) {
			return target[prop];
		}

		const tagName = prop as HTMLTagName;
		const elementFn = createElement(tagName);
		target[tagName] = elementFn;
		return elementFn;
	},
}) as HTMLElementProxy;

/**
 * Creates a factory function for virtual DOM elements of a specified HTML tag type.
 *
 * @template T - The HTML tag name type (extends HTMLTagName)
 * @param type - The HTML tag name to create elements for
 * @returns A factory function that accepts optional props and children, and returns a virtual DOM node
 *
 * The returned factory function has the following behavior:
 * - If the first argument is a valid props object, it's used as the element's properties
 * - All other arguments (or all arguments if no props object is provided) are treated as children
 * - Children arrays are flattened automatically
 * - String and number children are converted to strings
 * - Objects that match the VNode structure are treated as VNode children
 */
function createElement<T extends HTMLTagName>(type: T): HTMLElementFactory<T> {
	return (...args: unknown[]): VNode<T> => {
		const isPropsObject =
			args[0] &&
			typeof args[0] === "object" &&
			!Array.isArray(args[0]) &&
			!(
				(args[0] as VNode).type &&
				(args[0] as VNode).props &&
				(args[0] as VNode).children
			);

		const childArgs = isPropsObject ? args.slice(1) : args;

		const children = childArgs.map((child) =>
			isVNodeString(child) ? String(child) : (child as VNode),
		);

		const props = (isPropsObject ? args[0] : {}) as VNodeProps<T>;

		return { type, props, children };
	};
}
