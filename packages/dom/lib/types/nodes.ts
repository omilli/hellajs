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
export type HookType = "beforeMount" | "afterMount" | "beforeDestroy" | "afterDestroy" | "beforeUpdate" | "afterUpdate";

/**
 * Stackable hooks stored on elements.
 */
export interface HookStacks {
  beforeMount: Array<() => void>;
  afterMount: Array<(node?: Element) => void>;
  beforeDestroy: Array<(node?: Element) => void>;
  afterDestroy: Array<() => void>;
  beforeUpdate: Array<(node?: Element) => void>;
  afterUpdate: Array<(node?: Element) => void>;
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
  __scope?: () => void;
}

/**
 * Hooks for a DOM element.
 */
export interface ElementHooks {
  beforeMount?: (() => void);
  afterMount?: ((node?: Element) => void);
  /** Called when the element is removed from the DOM. */
  beforeDestroy?: ((node?: Element) => void);
  afterDestroy?: (() => void);
  /** Called when the element's properties or children are updated. */
  beforeUpdate?: ((node?: Element) => void);
  afterUpdate?: ((node?: Element) => void);
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
  __hella_effects?: [() => void];
  __hella_handlers?: Record<string, EventListener>;
  __hella_component_scope?: () => void;
  __hella_portal_cleanup?: () => void;
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
  /** Bind reactive values - string/primitive sets textContent, object sets attributes */
  bind(value: HellaPrimitive | HellaProps): R;
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
  /** Stop watching for new elements and clear queued operations */
  dispose(): void;
}

/**
 * Reactive reference to DOM elements with automatic watching.
 * Array-like collection of ReactiveElement wrappers with declarative methods.
 * @template T - The HTML element type
 */
export interface ReactiveRef<T extends Element = Element> {
  /** Get raw DOM node at index (default: 0) */
  (index?: number): T | undefined;
  readonly length: number;
  [index: number]: ReactiveElement<T>;
  /** Bind reactive values - string/primitive sets textContent, object sets attributes */
  bind(value: HellaPrimitive | HellaProps): ReactiveRef<T>;
  /** Add event handlers to all elements */
  on<K extends keyof DOMEventMap>(event: K, handler: (this: T, event: DOMEventMap[K]) => void): ReactiveRef<T>;
  /** Add stackable hooks to all elements */
  hooks(hooksObj: ElementHooks): ReactiveRef<T>;
  /** Iterate over element wrappers for imperative access */
  forEach(callback: (element: ReactiveElement<T>, index: number) => void): ReactiveRef<T>;
  /** Stop watching for new elements and clear queued operations */
  dispose(): void;
}

export type HellaForEach = ((parent: HellaElement) => void) & { isForEach?: boolean };

/**
 * Portal insertion type options.
 */
export type PortalInsertType = "append" | "prepend" | "replace" | "before" | "after";

/**
 * Props for the Portal component.
 */
export interface PortalProps {
  /** CSS selector for target element */
  to: string;
  /** Insertion method (default: "append") */
  type?: PortalInsertType;
  /** Content to portal */
  children?: HellaChild[];
}

/**
 * Portal function return type.
 */
export type HellaPortal = ((parent: HellaElement) => void) & { isPortal?: boolean };

/**
 * The render function for a `forEach` loop.
 * @template T
 */
export type ForEachFn<T> = (item: T, index: number) => HellaChild;

/**
 * Props for the ForEach component.
 * @template T
 */
export interface ForEachProps<T> {
  /** Array of items (static array, signal, or function) */
  each: T[] | (() => T[]);
  /** Render function for each item */
  use: ForEachFn<T>;
  /** Fallback content when array is empty */
  fallback?: HellaChild;
}

/**
 * Internal marker for placeholder substitution during template parsing.
 */
export interface PlaceholderMarker {
  __placeholder: number;
}

/**
 * Internal marker for dynamic component resolution during template parsing.
 */
export interface DynamicComponentMarker {
  __dynamicComponent: number;
  props: Record<string, unknown>;
  children: HellaChild[];
}

/**
 * Internal node type used during template parsing (before value substitution).
 */
export type InternalNode = HellaNode | PlaceholderMarker | DynamicComponentMarker;

/**
 * Mutable node type during parsing (before finalization).
 */
export type ParsedNode = DynamicComponentMarker | (HellaNode & { children: HellaChild[] });

/**
 * Component function signature for reusable components.
 */
export type ComponentFunction = (props: Record<string, unknown>) => HellaNode | (() => HellaNode);

/**
 * Parsed attributes categorized by type (props, hooks, bind, on).
 */
export interface ParsedAttributes {
  props: Record<string, unknown>;
  hooks?: Partial<ElementHooks>;
  bind?: Record<string, HellaPrimitive>;
  on?: Record<string, EventListener>;
}

/**
 * Props object passed to element render function.
 * Each prop is a function that returns the current attribute value.
 * Accessing any property via Proxy always returns a function.
 */
export type ElementProps = Record<string, HellaPrimitive>;

/**
 * Render function for custom elements.
 */
export type ElementRender<T> = (props: T) => HellaNode | (() => HellaNode);