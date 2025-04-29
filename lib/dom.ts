import { type ReactiveObject, effect, type ListItemState } from './reactive';
import { html, type HTMLTagName } from './html';
import { type HTMLAttributes } from './types/attributes';
import { EventDelegator } from './events';

export interface VNode<T extends HTMLTagName = HTMLTagName> {
  type?: T;
  props: VNodeProps<T>;
  children: (VNode | VNodePrimative)[];
}

export interface VNodeRecord<T extends HTMLTagName = HTMLTagName> {
  type?: T;
  props: VNodeRecordProps<T>;
  children: (VNode | VNodePrimative)[];
}

export type VNodeRecordProps<T extends HTMLTagName = HTMLTagName> = HTMLAttributes<T> & {
  key: string | number;
  item: ReactiveObject<{}>;
};

export type VNodeProps<T extends HTMLTagName = HTMLTagName> = HTMLAttributes<T> & {
  key?: string | number;
  item?: ReactiveObject<{}>;
};

export type VNodePrimative<T = unknown> = string | number | boolean | (() => T);

export type VNodeValue = VNode | VNodePrimative;

export interface RenderOptions {
  root?: string | Node;
  previousNode?: Node | null;
}

// Store delegators by root element to avoid creating multiple for the same root
const delegatorCache = new WeakMap<Node, EventDelegator>();

const reactiveBindings = new WeakMap<() => unknown, {
  keyToItem: Map<string, ListItemState>,
  lastKeys: string[]
}>();

export { html };

/**
 * Renders a virtual DOM node to the actual DOM
 * 
 * @param vNode - Virtual node to render
 * @param options - Rendering options or CSS selector string
 * @returns The rendered DOM node
 */
export function render(
  vNode: VNode | string | (() => unknown),
  rootSelector: string = "#app"
): Node | null {
  // Resolve root element
  const parent = document.querySelector(rootSelector)

  if (!parent) {
    console.error(`Root element not found: rootSelector`);
    return null;
  }

  // Get event delegator
  let delegator: EventDelegator;

  if (delegatorCache.has(parent)) {
    delegator = delegatorCache.get(parent) as EventDelegator;
  } else {
    // Create and cache a new delegator
    delegator = new EventDelegator(parent);
    delegatorCache.set(parent, delegator);
  }

  // Render the VNode
  return renderToDOM(vNode, parent, delegator);
}

/**
 * Internal implementation of the DOM rendering logic
 */
function renderToDOM(
  vNode: VNode | string | (() => unknown),
  parent: Node,
  rootDelegator: EventDelegator
): Node | null {
  try {
    if (typeof vNode === 'string' || typeof vNode === 'number') {
      const text = vNode;
      const textNode = document.createTextNode(text);
      parent.appendChild(textNode);
      return textNode;
    }

    if (typeof vNode === 'function') {
      return renderFunctionalComponent(vNode, parent, rootDelegator);
    }

    // Render VNode 
    const { type, props, children } = vNode;

    if (!type) {
      console.warn('Invalid VNode: no type', vNode);
      return null;
    }

    // Create DOM element
    const element = document.createElement(type as keyof HTMLTagName);


    // Fastest way to look props
    // Using for-loop with cached length for maximum performance
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
          rootDelegator.addHandler(element, key.slice(2), value as EventListener);
        } else {
          effect(() => element.setAttribute(key, String(value())));
        }
      } else {
        element.setAttribute(key, String(value));
      }
    }


    // Render children (inline of renderVNodeChildren)
    const len = children.length;
    for (let i = 0; i < len; i++) {
      try {
        const child = children[i] as VNode;
        renderToDOM(child, element, rootDelegator);
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
 * @param oldNode - Node to replace (if any)
 * @param rootDelegator - Event delegator
 * @returns The created DOM node
 */
function renderFunctionalComponent(
  vNode: () => unknown,
  parent: Node,
  rootDelegator: EventDelegator
): Node | null {
  let domNode: Node | null = null;

  effect(() => {
    const value = vNode();

    if (Array.isArray(value)) {
      renderListComponent(value as VNodeRecord[], vNode, parent, domNode, rootDelegator);
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
  items: VNodeRecord[],
  vNode: () => unknown,
  parent: Node,
  domNode: Node | null,
  rootDelegator: EventDelegator
): void {
  const state = reactiveBindings.get(vNode) || {
    keyToItem: new Map<string, ListItemState>,
    lastKeys: []
  };

  const newKeys: string[] = [];
  const newKeyToItem = new Map<string, ListItemState>();

  for (let index = 0, len = items.length; index < len; index++) {
    const child = items[index];

    if (!child || !child.props || !child.props.key) {
      console.warn(`Skipping invalid VNode at index ${index}: missing key`, child);
      return;
    }

    const key = String(child.props.key);
    const item = child.props.item as ReactiveObject;

    if (typeof item !== "function" && !Object.hasOwn(item, "set")) {
      console.warn(`Skipping invalid ReactiveObject at index ${index}, key ${key}`, item);
      return;
    }

    newKeys.push(key);

    // Process list item (inline of processListItem)
    const existingItem = state.keyToItem.get(key);

    // Fast path: reuse existing item if unchanged
    if (existingItem && item && existingItem.reactiveObj === item && existingItem.vNode === child) {
      newKeyToItem.set(key, existingItem);
      return;
    }

    // Need to create or update the item
    let node = existingItem?.node;
    let effectCleanup = existingItem?.effectCleanup;

    // Clean up existing effect if reactive object changed
    if (effectCleanup && item !== existingItem?.reactiveObj) {
      effectCleanup();
      effectCleanup = undefined;
    }

    // Setup function child bindings (inline of setupFunctionChildBindings)
    if (!effectCleanup) {
      const childNodes = child.children || [];
      for (let index = 0, len = childNodes.length; index < len; index++) {
        const childNode = childNodes[index];
        if (typeof childNode === 'function') {
          effectCleanup = effect(() => {
            const childValue = childNode();
            if (node && node.childNodes[index]) {
              node.childNodes[index].textContent = String(childValue);
            }
          });
        }
      }
    }

    // Create new node if needed
    if (!node) {
      // Get delegator for parent
      const delegator = getDelegator(parent);
      const newNode = renderToDOM(child, parent, delegator);
      if (newNode) node = newNode;
    }

    // Store the item if node was created and item exists
    if (node && item) {
      newKeyToItem.set(key, {
        node,
        reactiveObj: item,
        vNode: child,
        effectCleanup
      });
    }
  };

  for (const [key, item] of state.keyToItem) {
    if (!newKeyToItem.has(key) && item.node.parentNode === parent) {
      if (item.effectCleanup) item.effectCleanup();
      item.reactiveObj.cleanup();

      if (item.node instanceof HTMLElement) {
        rootDelegator.removeHandlersForElement(item.node);
      }

      parent.removeChild(item.node);

      // Inline of cleanupChildVNodes - recursively clean up child VNodes
      const cleanupVNode = (vNode: VNode): void => {
        for (let index = 0, len = vNode.children.length; index < len; index++) {
          const child = vNode.children[index];
          if (typeof child !== 'string' && typeof child !== 'function') {
            cleanupVNode(child as VNode);
          }
        };
      };

      cleanupVNode(item.vNode);
      reactiveBindings.delete(vNode);
    }
  };

  // Reorder DOM nodes (inline of reorderDOMNodes)
  // Fast path: If array length unchanged, only move changed positions
  if (newKeys.length === state.lastKeys.length) {
    for (let i = 0; i < newKeys.length; i++) {
      if (newKeys[i] !== state.lastKeys[i]) {
        // Update node position (inline)
        const item = newKeyToItem.get(newKeys[i])!;
        const node = item.node;
        const currentNode = parent.childNodes[i];

        if (node !== currentNode) {
          parent.insertBefore(node, currentNode || null);
        }
      }
    }
  } else {
    // Otherwise reorder all elements
    for (let i = 0; i < newKeys.length; i++) {
      // Update node position (inline)
      const item = newKeyToItem.get(newKeys[i])!;
      const node = item.node;
      const currentNode = parent.childNodes[i];

      if (node !== currentNode) {
        parent.insertBefore(node, currentNode || null);
      }
    }
  }

  // Update list state for next render (inline of updateListState)
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
 * Gets or creates an event delegator for a parent node
 */
function getDelegator(parent: Node): EventDelegator {
  if (!(parent instanceof HTMLElement)) {
    // Create a temporary delegator for non-HTMLElement parents
    return new EventDelegator(document.body);
  }

  // Reuse existing delegator if available
  if (delegatorCache.has(parent)) {
    return delegatorCache.get(parent)!;
  }

  // Create and cache a new delegator
  const delegator = new EventDelegator(parent);
  delegatorCache.set(parent, delegator);
  return delegator;
}