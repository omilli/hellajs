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
export type HellaChild = HellaNode | HellaRaw | HellaPrimitive | Node | null | undefined;

/**
 * A raw HTML string rendered as an opaque child. `ssr` emits the HTML verbatim (marker-bounded);
 * `hydrate` adopts the existing server DOM without re-binding anything inside. Created by {@link raw};
 * the `{ raw }` shape is the duck-type contract `ssr`/`hydrate` recognize, so never hand-construct.
 */
export interface HellaRaw {
  raw: string;
}

/**
 * Error configuration attached to elements via error: prefix attributes.
 * Controls error boundary behavior and fallback rendering.
 */
export interface ErrorConfig {
  boundary?: boolean;
  fallback?: (error: Error) => HellaNode;
  category?: string;
}

/**
 * Context passed to error handlers via onError().
 * Provides error metadata and optional reset capability.
 */
export interface ErrorContext {
  phase: "render" | "mount" | "update" | "event";
  element?: Element;
  event?: Event;
  config?: ErrorConfig;
  reset?: () => void;
}

/**
 * Error handler function type for onError() registration.
 * Return HellaNode to render fallback, null/void to continue to next handler.
 */
export type ErrorFn = (error: Error, context: ErrorContext) => HellaNode | null | void;

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
  /** Hooks for the element. */
  hooks?: ElementHooks;
  /** The children of the node. */
  children?: HellaChild[];
  /** Template cache optimization marker — set during parsing on subtrees with zero placeholder dependencies. */
  static?: true;
  /** Component scope dispose function. */
  componentScope?: () => void;
  /** Error configuration (error: prefix attributes). */
  error?: ErrorConfig;
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
};

/**
 * Handle returned by mount() for controlling a mounted tree.
 */
export interface MountHandle {
  container: Element | ShadowRoot;
  flush(): void;
  unmount(): void;
}

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
/**
 * SSR rendering descriptor attached to isDynamic components.
 * Consumed type-only by `@hellajs/ssr`; carries the resolved props so a pure
 * stringifier can render ForEach/Transition/Portal/Lazy without DOM access.
 */
export interface SsrMeta {
  /** Which isDynamic component produced this function. */
  kind: "forEach" | "transition" | "portal" | "lazy" | "suspense";
  /** The resolved props object the component received (ssr casts to index it). */
  props: object;
}

export type RenderFn = ((element: HellaElement) => void) & { isDynamic: true; ssr?: SsrMeta };

/**
 * Function with an element argument for mount operations.
 */
export type ElementMountFn = (element: HellaElement) => void;

/**
 * A lifecycle hook callback — zero-arg (`beforeMount`, `afterDestroy`) or element-receiving.
 */
export type HookFn = (() => void) | ElementMountFn;

/**
 * Deprecated alias of `HookFn` — kept for backward compatibility; the package's
 * function-valued types use the `Fn` suffix consistently.
 * @deprecated Use `HookFn`.
 */
export type HookHandler = HookFn;

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

/**
 * Options for defining a custom element.
 */
export interface ElementOptions {
  /** Attach a shadow root instead of rendering to light DOM. `true` uses `{ mode: "open" }`; an object is passed to `attachShadow` verbatim. */
  shadow?: boolean | ShadowRootInit;
}

// ============================================================================
// LIFECYCLE SYSTEM
// Types for element lifecycle hooks and management
// ============================================================================

/** Void callback for lifecycle hooks without element access. */
type VoidHook = () => void;

/** Callback with optional element reference for lifecycle hooks. */
type ElementHook = (node?: Element) => void;

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
}

/**
 * Standard lifecycle hook types.
 */
export type HookType = "beforeMount" | "afterMount" | "beforeDestroy" | "afterDestroy" | "beforeUpdate" | "afterUpdate";

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
// TRANSITION COMPONENT
// Types for the Transition enter/leave animation component
// ============================================================================

/**
 * Props for the Transition component.
 */
export interface TransitionProps {
  /** Controls visibility. Boolean or reactive function returning boolean. */
  show: boolean | (() => boolean);
  /** Content to render when visible. Accepts a single child or an array (JSX/html compile component children to an array). */
  children?: HellaChild | HellaChild[];
  /** CSS class for enter animation (e.g., "fade-in" with animation: fadeIn .3s). */
  enter?: string;
  /** CSS class for leave animation (e.g., "fade-out" with animation: fadeOut .3s). */
  leave?: string;
  /** Animation duration in ms. Must match CSS. Used for leave cleanup scheduling. Default: 300. */
  duration?: number;
  /** Opt-in first-mount animation. true = reuse enter class, string = custom class. */
  appear?: boolean | string;
}

// ============================================================================
// LAZY COMPONENT
// ============================================================================

/**
 * Options passed to the Lazy loader function.
 */
export interface LazyOptions {
  signal?: AbortSignal;
}

/**
 * Props for the Lazy component.
 */
export interface LazyProps {
  loader: (options?: LazyOptions) => Promise<ComponentFn | HellaNode>;
  loading?: HellaChild;
  fallback?: HellaChild;
  props?: Record<string, unknown>;
}

/** Props for [`Suspense`](../dom) — a streaming + async boundary. */
export interface SuspenseProps {
  /** Content rendered while children are unresolved (shown during ssr.stream streaming + on a client fresh mount while a Promise child is pending; dropped under `ssr`/`ssr.async`). */
  fallback?: HellaChild;
  /** The boundary's content. Accepts a single child (`html\`\``) or an array — JSX and `html\`\`` compile component children to an array. A Promise-returning child suspends (client + server); sync children render directly. For reactive re-fetching, use `resource` + `<Show>`. */
  children?: HellaChild | HellaChild[];
}
