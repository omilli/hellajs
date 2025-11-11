import type {
  DOMEventMap,
  HTMLAttributeMap,
  HTMLAttributes,
} from "./attributes";


/**
 * The name of a valid HTML tag.
 */
export type HTMLTagName = keyof HTMLAttributeMap;

/**
 * Represents a virtual DOM node.
 * @template T
 */
export interface HellaNode<T extends HTMLTagName = HTMLTagName> {
  /** The HTML tag name. */
  tag?: T;
  /** The properties and attributes of the node. */
  props?: HellaProps<T>;
  /** The children of the node. */
  children?: HellaChild[];
}

/**
 * Lifecycle hooks for a DOM element.
 */
export interface ElementLifecycle {
  /** Called when the element is removed from the DOM. */
  onDestroy?: (() => void);
  /** Called when the element's properties or children are updated. */
  onUpdate?: (() => void);
  /** Array of effect functions that will be automatically registered and cleaned up. */
  effects?: (() => void)[];
}

/**
 * The properties of a HellaNode, including HTML attributes and lifecycle hooks.
 * @template T
 */
export type HellaProps<T extends HTMLTagName = HTMLTagName> = HTMLAttributes<T> & ElementLifecycle;

/**
 * A DOM element augmented with HellaJS-specific properties.
 */
export type HellaElement = Element & ElementLifecycle & {
  __hella_effects?: Set<() => void>;
  __hella_handlers?: Record<string, EventListener>;
  __hella_load?: Array<() => void>;
  __hella_queue?: Array<() => void>;
};

/**
 * A primitive value that can be used as a HellaNode child or property.
 * Can be a string, number, boolean, or a function that returns a value.
 * @template T
 */
export type HellaPrimitive<T = unknown> = string | string[] | number | boolean | ((...args: unknown[]) => T);

/**
 * Any value that can be rendered as a child in a HellaNode.
 */
export type HellaChild = HellaNode | HellaPrimitive | Node | unknown;

/**
 * The render function for a `forEach` loop.
 * @template T
 */
export type ForEach<T> = (item: T, index: number) => HellaChild;

/**
 * Base reactive element methods.
 * @template R - The return type for method chaining
 */
interface ReactiveElementBase<R> {
  /** Set reactive text content */
  text(value: HellaPrimitive): R;
  /** Set reactive attributes */
  attr(attributes: HellaProps): R;
  /** Add event handlers with proper typing */
  on<K extends keyof DOMEventMap>(event: K, handler: (this: Element, event: DOMEventMap[K]) => void): R;
}

/**
 * Element wrapper for DOM manipulation.
 * @template T - The HTML element type for proper attribute typing
 */
export interface ReactiveElement<T extends Element = Element> extends ReactiveElementBase<ReactiveElement<T>> {
  /** Register callback to execute when element enters DOM */
  onLoad(callback: () => void): ReactiveElement<T>;
  /** Access to the raw DOM element */
  get node(): T | null;
}

/**
 * Array-like interface for element collections.
 */
export interface ReactiveElements<T extends Element = Element> {
  readonly length: number;
  [index: number]: ReactiveElement<T>;
  forEach(callback: (element: ReactiveElement<T>, index: number) => void): ReactiveElements<T>;
}