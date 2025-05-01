import { computed, effect, signal, type Signal } from './reactive';
import { html, type HTMLTagName } from './html';
import { type HTMLAttributes } from './types/attributes';
import { EventDelegator } from './events';

export interface VNode<T extends HTMLTagName = HTMLTagName> {
  type?: T;
  props: VNodeProps<T>;
  children: (VNode | VNodePrimative)[];
}

export interface VNodeStore<T extends HTMLTagName = HTMLTagName> {
  type?: T;
  props: VNodeStoreProps<T>;
  children: (VNode | VNodePrimative)[];
}

export type VNodeProps<T extends HTMLTagName = HTMLTagName> = HTMLAttributes<T> & {
  key?: string | number;
  item?: Signal<{}>;
};

export type VNodeStoreProps<T extends HTMLTagName = HTMLTagName> = HTMLAttributes<T> & {
  item: Signal<{ id?: string | number }>;  // Assuming items might have an id property
};

export type VNodePrimative<T = unknown> = string | number | boolean | (() => T);

export type VNodeValue = VNode | VNodePrimative;

export interface ListStore {
  node: Node;
  effectCleanup?: () => void;
}

// Store delegators by root element to avoid creating multiple for the same root
const rootRegistry = new Map<string, EventDelegator>();

const reactiveBindings = new WeakMap<() => unknown, {
  keyToItem: Map<string, ListStore>,
  lastKeys: string[]
}>();

export { html };

/**
 * Renders a virtual DOM node to the actual DOM
 * 
 * @param vNode - Virtual node to render
 * @param rootSelector - CSS selector for root element
 * @returns The rendered DOM node
 */
export function render(
  vNode: VNode | string | (() => unknown),
  rootSelector: string = "#app"
): Node | null {
  const root = document.querySelector(rootSelector) as HTMLElement;
  rootRegistry.set(rootSelector, new EventDelegator(rootSelector));
  return renderToDOM(vNode, root, rootSelector);
}

/**
 * Internal implementation of the DOM rendering logic
 */
function renderToDOM(
  vNode: VNode | string | (() => unknown),
  parent: Node,
  rootSelector: string
): Node | null {
  try {
    if (typeof vNode === 'string' || typeof vNode === 'number') {
      const text = vNode;
      const textNode = document.createTextNode(text);
      parent.appendChild(textNode);
      return textNode;
    }

    if (typeof vNode === 'function') {
      return renderFunctionalComponent(vNode, parent, rootSelector);
    }

    // Render VNode 
    const { type, props, children } = vNode;

    if (!type) {
      console.warn('Invalid VNode: no type', vNode);
      return null;
    }

    // Create DOM element
    const element = document.createElement(type as keyof HTMLTagName);

    // Get appropriate delegator for this element
    const delegator = rootRegistry.get(rootSelector);

    // Process props
    const keys = Object.keys(props);
    const keyLen = keys.length;

    for (let i = 0; i < keyLen; i++) {
      const key = keys[i];
      const value = props[key];

      if (key === 'key' || key === 'item') {
        continue;
      }

      if (typeof value === 'function') {
        if (key.startsWith('on')) {
          delegator?.addHandler(element, key.slice(2), value as EventListener);
        } else {
          effect(() => element.setAttribute(key, value() as string));
        }
      } else {
        element.setAttribute(key, value as string);
      }
    }

    // Render children (inline of renderVNodeChildren)
    const len = children.length;
    for (let i = 0; i < len; i++) {
      try {
        const child = children[i] as VNode;
        renderToDOM(child, element, rootSelector);
      } catch (e) {
        console.error(`Error rendering child at index ${i}:`, e);
      }
    }

    parent.appendChild(element);
    return element;
  } catch (e) {
    console.error('rdom error:', e);
    return null;
  }
}

/**
 * Renders a functional component
 * 
 * @param vNode - Function that returns content to render
 * @param parent - Parent DOM node
 * @param rootSelector - CSS selector for root element
 * @returns The created DOM node
 */
function renderFunctionalComponent(
  vNode: () => unknown,
  parent: Node,
  rootSelector: string
): Node | null {
  let domNode: Node | null = null;

  effect(() => {
    const value = vNode();

    if (Array.isArray(value)) {
      renderListComponent(value as VNode[], vNode, parent, domNode, rootSelector);
    } else {
      // Simple text content from function
      const textContent = value as string;

      if (!domNode) {
        domNode = document.createTextNode(textContent);
        parent.appendChild(domNode);
      } else {
        domNode.textContent = textContent;
      }
    }
  });

  return domNode;
}

/**
 * Renders a list of VNodes from a functional component
 */
function renderListComponent(
  items: VNode[],
  vNode: () => unknown,
  parent: Node,
  domNode: Node | null,
  rootSelector: string
): void {
  const state = reactiveBindings.get(vNode) || {
    keyToItem: new Map<string, ListStore>(),
    lastKeys: []
  };

  const newKeys: string[] = [];
  const newKeyToItem = new Map<string, ListStore>();

  for (let index = 0, len = items.length; index < len; index++) {
    const child = items[index];

    // Extract key from props.key, internal __item.id, or props.item.id if available
    let key: string;
    let storeItem: Signal<{}> | undefined;

    // First check if it has a direct item reference (from List.map)
    if ('__item' in child) {
      storeItem = child.__item as Signal<{}>;

      // Try to get key from props or from the store item
      if (child.props?.key !== undefined) {
        key = String(child.props.key);
      } else if ('id' in storeItem) {
        key = String((storeItem as unknown as { id: string | number }).id);
      } else {
        console.warn(`Skipping item at index ${index}: missing key or id`, child);
        continue;
      }
    }
    // Then fall back to legacy approach with item as prop
    else if (child.props?.item) {
      storeItem = child.props.item as Signal<{}>;

      if (child.props?.key !== undefined) {
        key = String(child.props.key);
      } else if ('id' in storeItem) {
        key = String((storeItem as unknown as { id: string | number }).id);
      } else {
        console.warn(`Skipping item at index ${index}: missing key or id`, child);
        continue;
      }
    }
    // Finally, just use the key prop as a last resort
    else if (child.props?.key !== undefined) {
      key = String(child.props.key);
    } else {
      console.warn(`Skipping node at index ${index}: missing key`, child);
      continue;
    }

    if (storeItem && typeof storeItem !== "object" && typeof storeItem !== "function") {
      console.warn(`Skipping invalid reactive object at index ${index}, key ${key}`);
      continue;
    }

    newKeys.push(key);

    const existingItem = state.keyToItem.get(key);

    // Fast path: reuse existing node if unchanged
    if (
      existingItem &&
      existingItem.node.parentNode === parent
    ) {
      newKeyToItem.set(key, existingItem);
      continue;
    }

    // Create or update the item
    let node = existingItem?.node;
    let effectCleanup = existingItem?.effectCleanup;

    // Clean up existing effect if node is reused with new bindings
    if (effectCleanup && !node) {
      effectCleanup();
      effectCleanup = undefined;
    }

    // Setup function child bindings
    if (!effectCleanup) {
      const childNodes = child.children || [];
      for (let i = 0, len = childNodes.length; i < len; i++) {
        const childNode = childNodes[i];
        if (typeof childNode === 'function') {
          effectCleanup = effect(() => {
            const childValue = childNode();
            if (node && node.childNodes[i]) {
              node.childNodes[i].textContent = childValue as string;
            }
          });
        }
      }
    }

    // Create new node if needed
    if (!node) {
      const newNode = renderToDOM(child, parent, rootSelector);
      if (newNode) node = newNode;
    }

    // Store the item if node was created
    if (node) {
      newKeyToItem.set(key, {
        node,
        effectCleanup
      });
    }
  }

  // Clean up removed items
  for (const [key, item] of state.keyToItem) {
    if (!newKeyToItem.has(key) && item.node.parentNode === parent) {
      if (item.effectCleanup) item.effectCleanup();

      // Clean up reactive object
      const reactiveObj = items.find(i => String(i.props.key) === key)?.props.item;
      if (reactiveObj && "cleanup" in reactiveObj) {
        (reactiveObj as Signal<{}>).cleanup();
      }

      if (item.node instanceof HTMLElement) {
        const delegator = rootRegistry.get(rootSelector);
        delegator?.removeHandlersForElement(item.node);
      }

      parent.removeChild(item.node);
    }
  }

  // Reorder DOM nodes
  if (newKeys.length === state.lastKeys.length) {
    for (let i = 0; i < newKeys.length; i++) {
      if (newKeys[i] !== state.lastKeys[i]) {
        const item = newKeyToItem.get(newKeys[i])!;
        const node = item.node;
        const currentNode = parent.childNodes[i];
        if (node !== currentNode) {
          parent.insertBefore(node, currentNode || null);
        }
      }
    }
  } else {
    for (let i = 0; i < newKeys.length; i++) {
      const item = newKeyToItem.get(newKeys[i])!;
      const node = item.node;
      const currentNode = parent.childNodes[i];
      if (node !== currentNode) {
        parent.insertBefore(node, currentNode || null);
      }
    }
  }

  // Update state
  state.keyToItem.clear();
  state.lastKeys = newKeys;
  reactiveBindings.set(vNode, state);
  for (const [key, item] of newKeyToItem) {
    state.keyToItem.set(key, item);
  }

  // Clean up if list is empty
  if (newKeys.length === 0) {
    reactiveBindings.delete(vNode);
  }

  // Update domNode reference
  if (domNode === null && newKeys.length > 0) {
    domNode = state.keyToItem.get(newKeys[0])?.node || null;
  }
}
/**
 * List provides a declarative way to render arrays of items
 * 
 * @param items - Array of items to render
 * @returns A List builder object with mapping methods
 */
export function List<T extends {}>(
  data: Signal<T[]>,
  mapFn: (item: T, index: number) => VNode
) {
  return () => data().map((item, index) => {
    const node = mapFn(item, index);

    // Automatically embed a key if the item has an id property
    if ('id' in item && !('key' in node.props)) {
      node.props.key = (item as unknown as { id: string | number }).id;
    }

    // Always mark this node as having an associated item
    (node as unknown as VNode & { __item: T }).__item = item;

    return node;
  });
}