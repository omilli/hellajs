import type { Signal } from "./reactive";
import type { HTMLAttributes } from "./attributes";
import type { HTMLTagName } from "./html";

/**
 * Event handler function that receives an event and optional target element.
 */
export type EventFn<E extends Event = Event> = (e: E, element?: HTMLElement) => void;

/**
 * Maps DOM event types to their corresponding handler functions.
 * Allows us to use event name props with an "on" prefix.
 */
type VNodeEventHandlers = {
	[K in keyof GlobalEventHandlersEventMap as `on${string & K}`]?: (
		event: GlobalEventHandlersEventMap[K],
		element?: HTMLElement,
	) => void;
};

export type VNodeString = string | number;

/**
 * Defines the properties available for a specific HTML element type.
 * Excludes event handlers (which are handled separately).
 */
type VNodeAttributes<T extends HTMLTagName> = HTMLAttributes<T> &
	VNodeEventHandlers;

/**
 * Represents properties that can be applied to a virtual DOM node.
 * Combines element-specific attributes with common properties.
 */
export type VNodeProps<T extends HTMLTagName> = VNodeAttributes<T> & {
	preventDefault?: boolean;
	stopPropagation?: boolean;
	key?: VNodeString;
};

/**
 * Represents the value of a virtual DOM node to be added to the dom.
 */
export type VNodeValue = VNode | VNodeString | boolean | Signal<unknown>;

/**
 * Defines the core structure of a virtual DOM node with required properties.
 * Represents an HTML element with its type, properties, and children.
 */
export type VNodeBase<T extends HTMLTagName = HTMLTagName> = {
	type: T;
	props?: VNodeProps<T>;
	children?: (VNode | string)[];
} & Signal<T>

/**
 * A flexible virtual DOM node where all properties are optional.
 * This allows for fragments (nodes without a type) and other special cases.
 */
export type VNode<T extends HTMLTagName = HTMLTagName> = Partial<VNodeBase<T>>;

/**
 * Object with a known ID property
 */
export interface WithId {
	id: VNodeString;
}
