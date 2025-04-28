// reactive-vdom.ts
// A TypeScript implementation of a SolidJS-like fine-grained reactivity system
// using a virtual DOM with h function, optimized for minimal list updates.

// --- Types ---

export interface RNode {
  tag?: string;
  props: Record<string, any>;
  children: (RNode | string | (() => any))[];
}

interface CachedNode {
  domNode: Node;
}

export interface ReactiveObject<T> {
  get: <K extends keyof T>(key: K) => T[K];
  set: <K extends keyof T>(key: K, value: T[K]) => void;
}

interface ListItemState {
  node: Node;
  reactiveObj: ReactiveObject<any>;
  effectCleanup?: () => void;
}

// --- Reactive Primitives ---

type Effect = () => void;

export function createSignal<T>(value: T): [() => T, (newValue: T) => void] {
  const subscribers = new Set<Effect>();
  let currentValue = value;

  const get = (): T => {
    const current = getCurrentObserver();
    if (current) subscribers.add(current);
    return currentValue;
  };

  const set = (newValue: T): void => {
    if (currentValue !== newValue) {
      currentValue = newValue;
      for (const sub of subscribers) sub();
    }
  };

  return [get, set];
}

export function createStore<T extends object>(initial: T): ReactiveObject<T> {
  const signals = new Map<keyof T, [() => any, (newValue: any) => void]>();
  for (const key in initial) {
    signals.set(key, createSignal<any>(initial[key]));
  }

  const get = <K extends keyof T>(key: K): T[K] => {
    return signals.get(key)![0]() as T[K];
  };

  const set = <K extends keyof T>(key: K, value: T[K]): void => {
    signals.get(key)![1](value);
  };

  return { get, set };
}

let currentObserver: Effect | null = null;

function createEffect(fn: () => void): () => void {
  let execute: Effect | null = () => {
    currentObserver = execute;
    fn();
    currentObserver = null;
  };
  execute();
  return () => {
    execute = null;
  };
}

function getCurrentObserver(): Effect | null {
  return currentObserver;
}

type RNodeValue = RNode | string | (() => any) | string;

export function h(tag: string, props: Record<string, any> = {}, children: RNodeValue[] | RNodeValue): RNode {
  return {
    tag,
    props,
    children: Array.isArray(children) ? children : [children],
  };
}

// --- Runtime Reactivity System ---

const reactiveBindings = new Map<Node | (() => any), any>(); // Maps nodes or functions to their reactive data
const vdomCache = new Map<RNode | string | (() => any), CachedNode>(); // Cache virtual DOM structure

export function setupReactiveVdom(
  vnode: RNode | string | (() => any),
  parent: Node,
  realParent: Node,
  oldNode: Node | null = null
): Node | null {
  // Check cache for static or previously processed nodes
  if (typeof vnode !== "function" && vdomCache.has(vnode)) {
    const cached = vdomCache.get(vnode)!;
    if (oldNode && oldNode !== cached.domNode) {
      realParent.replaceChild(cached.domNode, oldNode);
    } else if (!oldNode) {
      realParent.appendChild(cached.domNode);
    }
    return cached.domNode;
  }

  // Handle dynamic expressions (e.g., signal getters or lists)
  if (typeof vnode === "function" && !reactiveBindings.has(vnode)) {
    const state = {
      keyToItem: new Map<string, ListItemState>(),
      lastKeys: [] as string[],
    };

    createEffect(() => {
      const value = vnode();
      if (Array.isArray(value)) {
        const newKeys: string[] = [];
        const newKeyToItem = new Map<string, ListItemState>();

        // Process new items
        value.forEach((child: RNode) => {
          const key = child && typeof child === "object" && "props" in child && child.props.key;
          if (!key) throw new Error("List items must have a unique key");

          newKeys.push(key);

          const existingItem = state.keyToItem.get(key);
          const todo = child.props.todo as ReactiveObject<any> | undefined;

          if (existingItem && todo && existingItem.reactiveObj === todo) {
            // Reuse unchanged item
            newKeyToItem.set(key, existingItem);
          } else {
            // Create or update item
            let node = existingItem?.node;
            let effectCleanup = existingItem?.effectCleanup;

            // Clean up old effect if replacing
            if (effectCleanup && todo !== existingItem?.reactiveObj) {
              effectCleanup();
              effectCleanup = undefined;
            }

            // Create effect for dynamic children
            if (!effectCleanup) {
              const childNodes = child.children || [];
              childNodes.forEach((childNode, index) => {
                if (typeof childNode === "function") {
                  effectCleanup = createEffect(() => {
                    const value = childNode();
                    if (node && node.childNodes[index]) {
                      node.childNodes[index].textContent = String(value);
                    }
                  });
                }
              });
            }

            // Render node if new
            if (!node) {
              const newNode = setupReactiveVdom(child, realParent, realParent, null);
              if (newNode) {
                node = newNode;
              }
            }

            if (node && todo) {
              newKeyToItem.set(key, { node, reactiveObj: todo, effectCleanup });
            }
          }
        });

        // Remove nodes for keys that no longer exist
        state.keyToItem.forEach((item, key) => {
          if (!newKeyToItem.has(key) && item.node.parentNode === realParent) {
            if (item.effectCleanup) {
              item.effectCleanup();
            }
            realParent.removeChild(item.node);
          }
        });

        // Optimize for append
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
          // Update DOM order, only move necessary nodes
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

        // Update state
        state.keyToItem.clear();
        newKeyToItem.forEach((item, key) => state.keyToItem.set(key, item));
        state.lastKeys = newKeys;
      } else {
        // Handle single dynamic value
        const domNode = document.createTextNode(String(value));
        const lastItem = state.keyToItem.get("single");
        if (lastItem) {
          if (lastItem.effectCleanup) {
            lastItem.effectCleanup();
          }
          realParent.replaceChild(domNode, lastItem.node);
        } else {
          realParent.appendChild(domNode);
        }
        state.keyToItem.clear();
        state.keyToItem.set("single", { node: domNode, reactiveObj: {} as any });
        state.lastKeys = ["single"];
      }
      reactiveBindings.set(vnode, state);
    });
    return state.keyToItem.get(state.lastKeys[0])?.node || null;
  }

  // Handle text nodes
  if (typeof vnode === "string") {
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

  // Handle element nodes
  const { tag, props, children } = vnode as RNode;
  if (!tag) return null;

  const element = document.createElement(tag);

  // Apply props (attributes and event listeners)
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (typeof value === "function") {
      createEffect(() => {
        element.setAttribute(key, String(value()));
      });
    } else if (key !== "key" && key !== "todo") {
      element.setAttribute(key, String(value));
    }
  }

  // Process children
  children.forEach((child) => {
    setupReactiveVdom(child, element, element);
  });

  // Update DOM
  if (oldNode) {
    realParent.replaceChild(element, oldNode);
  } else {
    realParent.appendChild(element);
  }

  vdomCache.set(vnode, { domNode: element });
  return element;
}
