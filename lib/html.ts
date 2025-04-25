import type {
	HTMLElementFactory,
	HTMLElementProxy,
	HTMLTagCache,
	HTMLTagName,
	VNode,
	VNodeProps,
} from "./types";
import { isObject, isString, isVNodeString, PascalCase } from "./utils";

const baseObject: HTMLTagCache = {
	$: (...args) => ({ children: args } as VNode),
	// Add a Fragment function that works the same as $
	Fragment: (...args) => ({ children: args } as VNode),
};

/**
 * A proxy object that dynamically creates HTML element functions.
 *
 * Features:
 * - Provides both lowercase (div) and Pascal case (Div) versions for all HTML elements
 * - Supports document fragment creation via $ function
 * - Lazily creates factory functions as needed
 */
export const html = new Proxy(baseObject, {
	get: (target, prop: string | symbol) => {
		if (!isString(prop)) {
			return Reflect.get(target, prop, target);
		}

		if (prop in target) {
			return target[prop];
		}

		// Handle both lowercase (div) and PascalCase (Div) versions
		const isPascalCase = prop.charAt(0) === prop.charAt(0).toUpperCase();
		const normalizedProp = isPascalCase ? PascalCase(prop.charAt(0).toLowerCase() + prop.slice(1)) : prop;

		// Create the element factory function
		const tagName = normalizedProp as HTMLTagName;
		const elementFn = createElement(tagName);

		// Store both lowercase and PascalCase versions
		target[normalizedProp] = elementFn;

		// If this was a request for the PascalCase version,
		// also create the lowercase version if it doesn't exist
		if (isPascalCase) {
			if (!target[normalizedProp]) {
				target[normalizedProp] = elementFn;
			}
			return elementFn;
		}

		// If this was a request for the lowercase version,
		// also create the PascalCase version if it doesn't exist
		const pascalProp = PascalCase(prop);
		if (!target[pascalProp]) {
			target[pascalProp] = elementFn;
		}

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
			isObject(args[0]) &&
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
