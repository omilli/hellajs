import type {
  DOMEventMap,
  HTMLAttributeMap,
  HTMLAttributes,
} from "./attributes";

// ============================================================================
// CORE VIRTUAL DOM
// Types for the virtual DOM node system (data structures, not DOM elements)
// ============================================================================

/**
 * The name of a valid HTML tag.
 */
export type HTMLTagName = keyof HTMLAttributeMap;

/**
 * A primitive value that can be used as a HellaNode child or property.
 * Can be a string, number, boolean, or a function that returns a value.
 * @template T
 */
export type HellaPrimitive<T = unknown> = string | string[] | number | boolean | ((...args: unknown[]) => T);

/**
 * Any value that can be rendered as a child in a HellaNode.
 */
export type HellaChild = HellaNode | HellaPrimitive | unknown;

/**
 * Represents a virtual DOM node.
 * @template T
 */
export interface HellaNode<T extends HTMLTagName = HTMLTagName> {
  /** The HTML tag name. */
  tag?: T;
  /** The properties and attributes of the node. */
  props?: HTMLAttributes<T>;
  /** Delegated event handlers mapped by event name. */
  on?: Record<string, EventListener>;
  /** Direct (non-delegated) event handlers mapped by event name. */
  e?: Record<string, EventListener>;
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
 * The properties of a HellaNode, including HTML attributes and hooks.
 * @template T
 */
export type HellaProps<T extends HTMLTagName = HTMLTagName> = HTMLAttributes<T> & ElementHooks;

/**
 * A DOM element augmented with HellaJS-specific properties.
 * This is a real DOM Element with added internal properties for tracking.
 */
export type HellaElement = Element & {
  textContent: string | null;
  value?: string;
  __hella_mounted?: boolean;
  __hella_hooks?: HookStacks;
  __hella_effects?: [() => void];
  __hella_handlers?: Record<string, EventListener>;
  __hella_direct_handlers?: Map<string, EventListener>;
  __hella_component_scope?: () => void;
  __hella_portal_cleanup?: () => void;
  __hella_onError?: ErrorHook;
  __hella_error_state?: boolean;
  __hella_original_node?: HellaNode;
  __hella_boundary?: HellaElement;
};

// ============================================================================
// COMPONENT SYSTEM
// Types for component functions, props, and rendering
// ============================================================================

export type ComponentReturn = HellaNode | (() => HellaNode);

/**
 * Component function signature for reusable components.
 */
export interface ComponentFn {
  (props: Record<string, unknown>): ComponentReturn;
  isDynamic?: boolean;
}

/**
 * Render function type for a component that renders into a parent element.
 * This is a function with an isDynamic flag that receives a parent element.
 */
export type RenderFn = ((element: HellaElement) => void) & { isDynamic: true };

/**
 * Function with an element argument for mount operations.
 */
export type ElementMountFn = (element: HellaElement) => void;

/**
 * Props object passed to component render function.
 * Each prop is a function that returns the current attribute value.
 * Accessing any property via Proxy always returns a function.
 */
export type ComponentProps = Record<string, HellaPrimitive>;

/**
 * Render function for custom elements.
 */
export type ComponentRenderFn<T> = (props: T) => ComponentReturn;

/**
 * Captured slot content from custom element children.
 */
export interface ComponentSlots {
  /** Default slot content (children without slot attribute) */
  children: Node[];
  /** Named slots mapped by slot name */
  slots: Record<string, Node[]>;
}

// ============================================================================
// LIFECYCLE SYSTEM
// Types for element lifecycle hooks and management
// ============================================================================

/** Void callback for lifecycle hooks without element access. */
type VoidHook = () => void;

/** Callback with optional element reference for lifecycle hooks. */
type ElementHook = (node?: Element) => void;

/** Error boundary hook for catching errors from element and descendants. */
type ErrorHook = (error: Error, reset: () => void) => HellaNode | void;

/**
 * Hooks for a DOM element.
 */
export interface ElementHooks {
  beforeMount?: VoidHook;
  afterMount?: ElementHook;
  beforeDestroy?: ElementHook;
  afterDestroy?: VoidHook;
  beforeUpdate?: ElementHook;
  afterUpdate?: ElementHook;
  onError?: ErrorHook;
}

/**
 * Standard lifecycle hook types (excludes onError which is handled separately).
 */
export type HookType = "beforeMount" | "afterMount" | "beforeDestroy" | "afterDestroy" | "beforeUpdate" | "afterUpdate";

/**
 * Stackable hooks stored on elements (arrays of each hook type).
 */
export type HookStacks = { [K in HookType]-?: NonNullable<ElementHooks[K]>[] };

// ============================================================================
// REFERENCE SYSTEM
// Types for wrapping and manipulating real DOM elements with reactive methods
// ============================================================================

/**
 * Base reactive wrapper methods.
 * @template T - The element type
 * @template R - The return type for method chaining
 */
interface DomWrapperBase<T extends Element, R> {
  /** Bind reactive values - string/primitive sets textContent, object sets attributes */
  bind(value: HellaPrimitive | HellaProps): R;
  /** Add event handlers with proper typing */
  on<K extends keyof DOMEventMap>(event: K, handler: (this: T, event: DOMEventMap[K]) => void): R;
  /** Add stackable hooks */
  hooks(hooks: ElementHooks): R;
}

/**
 * Element wrapper for DOM manipulation with reactive methods.
 * Wraps a real DOM element with chainable reactive operations.
 * @template T - The HTML element type for proper attribute typing
 */
export interface DomWrapper<T extends Element = Element> extends DomWrapperBase<T, DomWrapper<T>> {
  /** Access to the raw DOM element */
  get node(): T | null;
}

/**
 * Single element reference result type.
 * Lighter than DomCollection - no forEach, no dispose, no collection tracking.
 * Wraps a single DOM element with auto-watching and chainable methods.
 */
export interface DomRef<T extends Element = Element> extends DomWrapper<T> {
  /** Get raw DOM node */
  (): T | null;
}

/**
 * Reactive reference to DOM elements with automatic watching.
 * Array-like collection of DomWrapper instances with declarative methods.
 * @template T - The HTML element type
 */
export interface DomCollection<T extends Element = Element> extends DomWrapperBase<T, DomCollection<T>> {
  /** Get raw DOM node at index (default: 0) */
  (index?: number): T | undefined;
  readonly length: number;
  [index: number]: DomWrapper<T>;
  /** Iterate over element wrappers for imperative access */
  forEach(callback: (element: DomWrapper<T>, index: number) => void): DomCollection<T>;
  /** Stop watching for new elements and clear queued operations */
  dispose(): void;
}

// ============================================================================
// LIST & PORTAL COMPONENTS
// Types for ForEach and Portal special components
// ============================================================================

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
 * The render function for a `forEach` loop.
 * @template T
 */
export type ForEachRenderFn<T> = (item: T, index: number) => HellaChild;

/**
 * Props for the ForEach component.
 * @template T
 */
export interface ForEachProps<T> {
  /** Array of items (static array, signal, or function) */
  each: T[] | (() => T[]);
  /** Render function for each item */
  use: ForEachRenderFn<T>;
}

// ============================================================================
// INTERNAL PARSING (html`` template system)
// Internal use in html.ts
// ============================================================================

/**
 * Internal marker for placeholder substitution during template parsing.
 */
export interface HtmlPlaceholder {
  __placeholder: number;
}

/**
 * Props for the Lazy component.
 */
export interface LazyProps {
  loader: () => Promise<ComponentFn | HellaNode>;
  loading?: HellaChild;
  fallback?: HellaChild;
  props?: Record<string, unknown>;
}

/**
 * Internal marker for dynamic component resolution during template parsing.
 */
export interface HtmlDynamicComponent {
  __dynamicComponent: number;
  props: Record<string, unknown>;
  children: HellaChild[];
}

/**
 * Internal node type used during template parsing (before value substitution).
 */
export type HtmlInternalNode = HellaNode | HtmlPlaceholder | HtmlDynamicComponent;

/**
 * Mutable node type during parsing (before finalization).
 */
export type HtmlParsedNode = HtmlDynamicComponent | (HellaNode & { children: HellaChild[] });

/**
 * Parsed attributes categorized by type (props, hooks, bind, on, e).
 */
export interface HtmlParsedAttrs {
  props: Record<string, unknown>;
  hooks?: Partial<ElementHooks>;
  bind?: Record<string, HellaPrimitive>;
  on?: Record<string, EventListener>;
  e?: Record<string, EventListener>;
}
