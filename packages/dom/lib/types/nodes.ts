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
 * Hook types.
 */
export type HookType = "beforeMount" | "mount" | "beforeDestroy" | "destroy" | "beforeUpdate" | "update";

/**
 * Stackable hooks stored on elements.
 */
export interface HookStacks {
  beforeMount: Array<() => void>;
  mount: Array<() => void>;
  beforeDestroy: Array<() => void>;
  destroy: Array<() => void>;
  beforeUpdate: Array<() => void>;
  update: Array<() => void>;
}

/**
 * Represents a virtual DOM node.
 * @template T
 */
export interface HellaNode<T extends HTMLTagName = HTMLTagName> {
  /** The HTML tag name. */
  tag?: T;
  /** The properties and attributes of the node. */
  props?: HTMLAttributes<T>;
  /** Event handlers mapped by event name. */
  on?: Record<string, EventListener>;
  /** Dynamic reactive bindings mapped by property name. */
  bind?: Record<string, HellaPrimitive>;
  /** Hooks for the element. */
  hooks?: ElementHooks;
  /** The children of the node. */
  children?: HellaChild[];
  /** Component scope dispose function. */
  __componentScope?: () => void;
}

/**
 * Hooks for a DOM element.
 */
export interface ElementHooks {
  beforeMount?: (() => void);
  mount?: (() => void);
  /** Called when the element is removed from the DOM. */
  beforeDestroy?: (() => void);
  destroy?: (() => void);
  /** Called when the element's properties or children are updated. */
  beforeUpdate?: (() => void);
  update?: (() => void);
}

/**
 * The properties of a HellaNode, including HTML attributes and hooks.
 * @template T
 */
export type HellaProps<T extends HTMLTagName = HTMLTagName> = HTMLAttributes<T> & ElementHooks;

/**
 * A DOM element augmented with HellaJS-specific properties.
 */
export type HellaElement = Element & {
  __hella_mounted?: boolean;
  __hella_hooks?: HookStacks;
  __hella_effects?: Set<() => void>;
  __hella_handlers?: Record<string, EventListener>;
  __hella_component_scope?: () => void;
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
  /** Add stackable hooks */
  hooks(hooks: ElementHooks): R;
}

/**
 * Element wrapper for DOM manipulation.
 * @template T - The HTML element type for proper attribute typing
 */
export interface ReactiveElement<T extends Element = Element> extends ReactiveElementBase<ReactiveElement<T>> {
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

export type HellaForEach = ((parent: HellaElement) => void) & { isForEach?: boolean };

/**
 * The render function for a `forEach` loop.
 * @template T
 */
export type ForEach<T> = (item: T, index: number) => HellaChild;