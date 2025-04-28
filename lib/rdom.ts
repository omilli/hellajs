
// --- Types ---

/** Virtual DOM node representing an element, text, or reactive value. */
export interface VNode {
  tag?: string;
  props: Record<string, unknown>;
  children: (VNode | string | (() => unknown))[];
}

/** Cached DOM node for VNode reuse. */
export interface CachedNode {
  domNode: Node;
}

/** Reactive object for fine-grained updates. */
export interface ReactiveObject<T extends object = Record<string, unknown>> {
  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): void;
  cleanup(): void;
}

/** State for a list item in reactive list rendering. */
export interface ListItemState<T extends object = Record<string, unknown>> {
  node: Node;
  reactiveObj: ReactiveObject<T>;
  effectCleanup?: () => void;
  vNode: VNode;
}

/** Signal for reactive state management. */
export interface Signal<T> {
  get: () => T;
  set: (value: T) => void;
  cleanup: () => void;
}


/** Factory for HTML tags with type-safe props and children. */
export type HtmlTagFactory = (
  props?: Record<string, unknown>,
  ...children: Array<VNode | string | (() => unknown) | Array<VNode | string | (() => unknown)>>
) => VNode;

// --- Reactive Primitives ---

/**
 * Creates a reactive signal with getter, setter, and cleanup.
 * @param initial Initial value.
 * @returns [get, set, cleanup] tuple.
 */
export function createSignal<T>(initial: T): Signal<T> {
  const subscribers = new Set<() => void>();
  let value = initial;

  const get = () => {
    const current = getCurrentObserver();
    if (current) subscribers.add(current);
    return value;
  };

  const set = (newValue: T) => {
    if (value !== newValue) {
      value = newValue;
      for (const sub of subscribers) sub();
    }
  };

  const cleanup = () => {
    subscribers.clear();
  };

  return { get, set, cleanup };
}

/**
 * Creates a reactive store for an object with per-key signals.
 * @param initial Initial object.
 * @returns Reactive object with get, set, and cleanup.
 */
export function createStore<T extends object>(initial: T): ReactiveObject<T> {
  const signals = new Map<keyof T, Signal<T[keyof T]>>();
  for (const key in initial) {
    signals.set(key, createSignal(initial[key]) as unknown as Signal<T[keyof T]>);
  }

  return {
    get: <K extends keyof T>(key: K) => signals.get(key)!.get() as T[K],
    set: <K extends keyof T>(key: K, value: T[K]) => signals.get(key)!.set(value),
    cleanup: () => {
      signals.forEach(signal => signal.cleanup());
      signals.clear();
    },
  };
}

/** Tracks the current reactive observer (effect). */
let currentObserver: (() => void) | null = null;

/**
 * Gets the current observer for dependency tracking.
 * @returns Current observer or null.
 */
function getCurrentObserver(): (() => void) | null {
  return currentObserver;
}

/**
 * Creates a reactive effect that runs when dependencies change.
 * @param fn Effect function.
 * @returns Cleanup function.
 */
export function createEffect(fn: () => void): () => void {
  let execute: (() => void) | null = () => {
    currentObserver = execute;
    try {
      fn();
    } catch (e) {
      console.error('Effect error:', e);
    }
    currentObserver = null;
  };
  execute();
  return () => {
    execute = null;
  };
}

// --- Virtual DOM ---

/**
 * Converts camelCase to kebab-case for HTML tags (e.g., TableBody -> table-body).
 * @param camel CamelCase string.
 * @returns Kebab-case string.
 */
function camelToKebabCase(camel: string): string {
  return camel
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

/**
 * Creates a VNode for an element, text, or reactive value.
 * @param tag HTML tag name.
 * @param props Element properties.
 * @param children Child nodes or reactive values.
 * @returns VNode.
 */
function h(tag: string, props: Record<string, unknown> = {}, ...children: Array<VNode | string | (() => unknown) | Array<VNode | string | (() => unknown)>>): VNode {
  const normalizedChildren = children.flat(Infinity) as (VNode | string | (() => unknown))[];
  return { tag, props, children: normalizedChildren };
}

/** Dynamic HTML proxy for creating VNodes with JSX-like syntax. */
export const html = new Proxy<Record<string, HtmlTagFactory>>(
  {},
  {
    get(_, tag: string): HtmlTagFactory {
      return (props = {}, ...children) => h(camelToKebabCase(tag), props, ...children);
    },
  }
);
const vdomCache = new Map<VNode | string | (() => unknown), CachedNode>();

/** Cache for reactive bindings, using WeakMap for GC. */
const reactiveBindings = new WeakMap<() => unknown, { keyToItem: Map<string, ListItemState>; lastKeys: string[] }>();

/**
 * Renders a VNode to the DOM with reactive updates.
 * @param vnode VNode, text, or reactive function.
 * @param parent Parent DOM node.
 * @param realParent Actual DOM parent for insertions.
 * @param oldNode Node to replace, if any.
 * @returns Rendered DOM node or null.
 */
export function rdom(
  vnode: VNode | string | (() => unknown),
  parent: Node,
  realParent: Node,
  oldNode: Node | null = null
): Node | null {
  try {
    if (typeof vnode !== 'function' && vdomCache.has(vnode)) {
      const cached = vdomCache.get(vnode)!;
      if (oldNode && oldNode !== cached.domNode) {
        realParent.replaceChild(cached.domNode, oldNode);
      } else if (!oldNode) {
        realParent.appendChild(cached.domNode);
      }
      return cached.domNode;
    }

    if (typeof vnode === 'function' && !reactiveBindings.has(vnode)) {
      const state: { keyToItem: Map<string, ListItemState>; lastKeys: string[] } = {
        keyToItem: new Map(),
        lastKeys: [],
      };

      createEffect(() => {
        const value = vnode();
        if (Array.isArray(value)) {
          const newKeys: string[] = [];
          const newKeyToItem = new Map<string, ListItemState>();

          value.forEach((child: VNode) => {
            const key = child.props.key as string;
            if (!key) throw new Error('List items must have a unique key');

            newKeys.push(key);

            const existingItem = state.keyToItem.get(key);
            const todo = child.props.todo as ReactiveObject | undefined;

            if (existingItem && todo && existingItem.reactiveObj === todo) {
              newKeyToItem.set(key, existingItem);
            } else {
              let node = existingItem?.node;
              let effectCleanup = existingItem?.effectCleanup;
              const vNode = existingItem?.vNode || child;

              if (effectCleanup && todo !== existingItem?.reactiveObj) {
                effectCleanup();
                effectCleanup = undefined;
              }

              if (!effectCleanup) {
                const childNodes = vNode.children || [];
                childNodes.forEach((childNode, index) => {
                  if (typeof childNode === 'function') {
                    effectCleanup = createEffect(() => {
                      const value = childNode();
                      if (node && node.childNodes[index]) {
                        node.childNodes[index].textContent = String(value);
                      }
                    });
                  }
                });
              }

              if (!node) {
                const newNode = rdom(vNode, realParent, realParent, null);
                if (newNode) node = newNode;
              }

              if (node && todo) {
                newKeyToItem.set(key, { node, reactiveObj: todo, effectCleanup, vNode });
              }
            }
          });

          state.keyToItem.forEach((item, key) => {
            if (!newKeyToItem.has(key) && item.node.parentNode === realParent) {
              if (item.effectCleanup) item.effectCleanup();
              item.reactiveObj.cleanup();
              realParent.removeChild(item.node);
              vdomCache.delete(item.vNode);
            }
          });

          if (
            newKeys.length > state.lastKeys.length &&
            newKeys.slice(0, state.lastKeys.length).every((k, i) => k === state.lastKeys[i])
          ) {
            for (let i = state.lastKeys.length; i < newKeys.length; i++) {
              const key = newKeys[i];
              const item = newKeyToItem.get(key)!;
              realParent.appendChild(item.node);
            }
          } else {
            for (let i = 0; i < newKeys.length; i++) {
              const key = newKeys[i];
              const item = newKeyToItem.get(key)!;
              const node = item.node;
              const currentNode = realParent.childNodes[i];
              if (node !== currentNode) {
                realParent.insertBefore(node, currentNode);
              }
            }
          }

          state.keyToItem.clear();
          newKeyToItem.forEach((item, key) => state.keyToItem.set(key, item));
          state.lastKeys = newKeys;
        } else {
          const domNode = document.createTextNode(String(value));
          const lastItem = state.keyToItem.get('single');
          if (lastItem) {
            if (lastItem.effectCleanup) lastItem.effectCleanup();
            lastItem.reactiveObj.cleanup();
            realParent.replaceChild(domNode, lastItem.node);
            vdomCache.delete(lastItem.vNode);
          } else {
            realParent.appendChild(domNode);
          }
          state.keyToItem.clear();
          state.keyToItem.set('single', { node: domNode, reactiveObj: {} as ReactiveObject, vNode: {} as VNode });
          state.lastKeys = ['single'];
        }
        reactiveBindings.set(vnode, state);
      });

      return state.keyToItem.get(state.lastKeys[0])?.node || null;
    }

    if (typeof vnode === 'string') {
      const textNode = document.createTextNode(vnode);
      if (oldNode && oldNode.nodeType === 3) {
        oldNode.textContent = vnode;
        vdomCache.set(vnode, { domNode: oldNode });
        return oldNode;
      }
      realParent.appendChild(textNode);
      vdomCache.set(vnode, { domNode: textNode });
      return textNode;
    }

    const { tag, props, children } = vnode as VNode;

    if (!tag) {
      console.warn('Invalid VNode: no tag', vnode);
      return null;
    }

    const element = document.createElement(tag);

    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith('on') && typeof value === 'function') {
        element.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      } else if (typeof value === 'function') {
        createEffect(() => {
          element.setAttribute(key, String(value()));
        });
      } else if (key !== 'key' && key !== 'todo') {
        element.setAttribute(key, String(value));
      }
    }

    children.forEach((child, index) => {
      try {
        rdom(child, element, element);
      } catch (e) {
        console.error(`Error rendering child at index ${index}:`, e);
      }
    });

    if (oldNode) {
      realParent.replaceChild(element, oldNode);
    } else {
      realParent.appendChild(element);
    }

    vdomCache.set(vnode, { domNode: element });
    return element;
  } catch (e) {
    console.error('setupReactiveVdom error:', e);
    return null;
  }
}