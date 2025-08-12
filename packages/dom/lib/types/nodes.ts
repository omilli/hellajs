import type { HTMLAttributeMap, HTMLAttributes } from "./attributes";

/**
 * The name of a valid HTML tag.
 */
export type HTMLTagName = keyof HTMLAttributeMap;

/**
 * Represents a virtual DOM node.
 * @template T
 */
export interface VNode<T extends HTMLTagName = HTMLTagName> {
  /** The HTML tag name. */
  tag?: T;
  /** The properties and attributes of the node. */
  props?: VNodeProps<T>;
  /** The children of the node. */
  children?: VNodeValue[];
}

/**
 * Lifecycle hooks for a DOM element.
 */
export interface ElementLifecycle {
  /** Called when the element is removed from the DOM. */
  onDestroy?: (() => void);
  /** Called when the element's properties or children are updated. */
  onUpdate?: (() => void);
}

/**
 * The properties of a VNode, including HTML attributes and lifecycle hooks.
 * @template T
 */
export type VNodeProps<T extends HTMLTagName = HTMLTagName> = HTMLAttributes<T> & ElementLifecycle;

/**
 * A DOM element augmented with HellaJS-specific properties.
 */
export type HellaElement = Element & {
  /** Set of cleanup functions to run when the element is destroyed. */
  hellaEffects?: Set<() => void>;
  /** Map of event listeners for delegated handling. */
  hellaEvents?: Map<string, EventListener>;
} & ElementLifecycle;

/**
 * A primitive value that can be used as a VNode child or property.
 * Can be a string, number, boolean, or a function that returns a value.
 * @template T
 */
export type VNodePrimative<T = unknown> = string | number | boolean | ((...args: unknown[]) => T);

/**
 * Any value that can be rendered as a child in a VNode.
 */
export type VNodeValue = VNode | VNodePrimative | Node | unknown;

/**
 * The render function for a `forEach` loop.
 * @template T
 */
export type ForEach<T> = (item: T, index: number) => VNodeValue;