import { type ReactiveObject, effect, type ListItemState } from './reactive';
import { html, type HTMLTagName } from './html';
import { type HTMLAttributes } from './types/attributes';
import { EventDelegator } from './events';
import { isString, isFunction, isArray } from './utils/is';

export interface VNode<T extends HTMLTagName = HTMLTagName> {
  type?: T;
  props: VNodeProps<T>;
  children: (VNode | VNodePrimative)[];
}

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
 * @param vnode - Virtual node to render
 * @param options - Rendering options or CSS selector string
 * @returns The rendered DOM node
 */
export function render(
  vnode: VNode | string | (() => unknown),
  options: RenderOptions | string = "#app"
): Node | null {
  try {
    // Normalize render options
    const opts = typeof options === 'string'
      ? { root: options, previousNode: null }
      : {
        root: options.root || "#app",
        previousNode: options.previousNode || null
      };

    // Resolve root element
    const parent = typeof opts.root === 'string'
      ? document.querySelector(opts.root)
      : opts.root;

    if (!parent) {
      console.error(`Root element not found: ${String(opts.root)}`);
      return null;
    }

    // Get event delegator
    let delegator: EventDelegator;
    if (!(parent instanceof HTMLElement)) {
      // Create temporary delegator for non-HTMLElement parents
      delegator = new EventDelegator(document.body);
    } else {
      // Reuse existing delegator if available
      if (delegatorCache.has(parent)) {
        delegator = delegatorCache.get(parent)!;
      } else {
        // Create and cache a new delegator
        delegator = new EventDelegator(parent);
        delegatorCache.set(parent, delegator);
      }
    }

    // Render the VNode
    return renderToDOM(vnode, parent, opts.previousNode, delegator);
  } catch (e) {
    console.error('render error:', e);
    return null;
  }
}

/**
 * Internal implementation of the DOM rendering logic
 */
function renderToDOM(
  vnode: VNode | string | (() => unknown),
  parent: Node,
  oldNode: Node | null = null,
  rootDelegator: EventDelegator
): Node | null {
  try {
    // Dispatch based on vnode type
    if (isString(vnode)) {
      // Handle text node creation/update
      const text = vnode;

      // Fast path: update existing text node
      if (oldNode && oldNode.nodeType === 3) {
        oldNode.textContent = text;
        return oldNode;
      }

      const textNode = document.createTextNode(text);

      // Replace or append
      if (oldNode) {
        parent.replaceChild(textNode, oldNode);
        if (oldNode instanceof HTMLElement) {
          rootDelegator.removeHandlersForElement(oldNode);
        }
      } else {
        parent.appendChild(textNode);
      }

      return textNode;
    }

    if (isFunction(vnode)) {
      return renderFunctionalComponent(vnode, parent, oldNode, rootDelegator);
    }

    return renderVNodeElement(vnode as VNode, parent, oldNode, rootDelegator);
  } catch (e) {
    console.error('rdom error:', e);
    return null;
  }
}

/**
 * Renders a functional component
 * 
 * @param vnode - Function that returns content to render
 * @param parent - Parent DOM node
 * @param oldNode - Node to replace (if any)
 * @param rootDelegator - Event delegator
 * @returns The created DOM node
 */
function renderFunctionalComponent(
  vnode: () => unknown,
  parent: Node,
  oldNode: Node | null,
  rootDelegator: EventDelegator
): Node | null {
  let domNode: Node | null = null;

  effect(() => {
    const value = vnode();

    if (isArray(value)) {
      renderListComponent(value as VNode[], vnode, parent, domNode, oldNode, rootDelegator);
    } else {
      // Simple text content from function
      const textContent = String(value);

      if (!domNode) {
        domNode = document.createTextNode(textContent);
        if (oldNode) {
          parent.replaceChild(domNode, oldNode);
        } else {
          parent.appendChild(domNode);
        }
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
  vnode: () => unknown,
  parent: Node,
  domNode: Node | null,
  oldNode: Node | null,
  rootDelegator: EventDelegator
): void {
  const state = reactiveBindings.get(vnode) || {
    keyToItem: new Map<string, ListItemState>,
    lastKeys: []
  };

  const newKeys: string[] = [];
  const newKeyToItem = new Map<string, ListItemState>();

  // Process each item in the array
  items.forEach((child: VNode, index) => {
    if (!child || !child.props || !child.props.key) {
      console.warn(`Skipping invalid VNode at index ${index}: missing key`, child);
      return;
    }

    const key = String(child.props.key);
    const item = child.props.item as ReactiveObject | undefined;

    if (!isValidReactiveObject(item)) {
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
      childNodes.forEach((childNode, childIndex) => {
        if (isFunction(childNode)) {
          effectCleanup = effect(() => {
            const childValue = childNode();
            if (node && node.childNodes[childIndex]) {
              node.childNodes[childIndex].textContent = String(childValue);
            }
          });
        }
      });
    }

    // Create new node if needed
    if (!node) {
      // Get delegator for parent
      const delegator = getDelegator(parent);
      const newNode = renderToDOM(child, parent, null, delegator);
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
  });

  // Clean up removed items (inline of cleanupRemovedItems)
  state.keyToItem.forEach((item, key) => {
    if (!newKeyToItem.has(key) && item.node.parentNode === parent) {
      if (item.effectCleanup) item.effectCleanup();
      item.reactiveObj.cleanup();

      if (item.node instanceof HTMLElement) {
        rootDelegator.removeHandlersForElement(item.node);
      }

      parent.removeChild(item.node);

      // Inline of cleanupChildVNodes - recursively clean up child VNodes
      const cleanupVNode = (vnode: VNode): void => {
        vnode.children.forEach(child => {
          if (!isString(child) && !isFunction(child)) {
            cleanupVNode(child as VNode);
          }
        });
      };

      cleanupVNode(item.vNode);
      reactiveBindings.delete(vnode);
    }
  });

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
  newKeyToItem.forEach((item, key) => state.keyToItem.set(key, item));
  state.lastKeys = newKeys;
  reactiveBindings.set(vnode, state);

  // Clean up if list is empty
  if (newKeys.length === 0) {
    reactiveBindings.delete(vnode);
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

/**
 * Renders a VNode element
 */
function renderVNodeElement(
  vnode: VNode,
  parent: Node,
  oldNode: Node | null,
  rootDelegator: EventDelegator
): Node | null {
  const { type, props, children } = vnode;

  if (!type) {
    console.warn('Invalid VNode: no type', vnode);
    return null;
  }

  // Create DOM element
  const element = document.createElement(type as keyof HTMLTagName);

  // Apply props to element (inline of applyPropsToElement)
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on') && isFunction(value)) {
      if (element instanceof HTMLElement) {
        rootDelegator.addHandler(element, key.slice(2).toLowerCase(), value as EventListener);
      }
    } else if (isFunction(value)) {
      effect(() => {
        element.setAttribute(key, String(value()));
      });
    } else if (key !== 'key' && key !== 'item') {
      element.setAttribute(key, String(value));
    }
  }

  // Render children (inline of renderVNodeChildren)
  children.forEach((child, index) => {
    try {
      renderToDOM(child as VNode, element, null, rootDelegator);
    } catch (e) {
      console.error(`Error rendering child at index ${index}:`, e);
    }
  });

  // Add element to DOM (inline of addElementToDOM)
  if (oldNode) {
    parent.replaceChild(element, oldNode);
    if (oldNode instanceof HTMLElement) {
      rootDelegator.removeHandlersForElement(oldNode);
    }
  } else {
    parent.appendChild(element);
  }

  return element;
}

/**
 * Validates if an object is a proper ReactiveObject with required methods
 * 
 * @param item - Object to validate
 * @returns boolean indicating if it's a valid reactive object
 */
function isValidReactiveObject(item: ReactiveObject | undefined): boolean {
  if (!item || typeof item !== 'function' || typeof item.set !== 'function') {
    return false;
  }

  try {
    const testKey = Object.keys(item).find(
      key => typeof item[key as keyof typeof item] !== 'function'
    ) as keyof typeof item | undefined;

    if (testKey) {
      const value = item(testKey);
      item.set(testKey, value);
    }
    return true;
  } catch {
    return false;
  }
}