import { type ReactiveObject, createEffect, type ListItemState } from './reactive';
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

const reactiveBindings = new WeakMap<() => unknown, {
  keyToItem: Map<string, ListItemState>,
  lastKeys: string[]
}>();

export { html };

/**
 * Renders a virtual DOM node to the actual DOM
 * 
 * @param vnode - Virtual node to render
 * @param parent - Parent DOM node
 * @param oldNode - Node to replace (if any)
 * @param rootDelegator - Event delegator for event handling
 * @returns Created or updated DOM node
 */
export function rdom(
  vnode: VNode | string | (() => unknown),
  parent: Node,
  oldNode: Node | null = null,
  rootDelegator?: EventDelegator
): Node | null {
  try {
    // Dispatch based on vnode type
    if (isString(vnode)) {
      return createTextNode(vnode, parent, oldNode, rootDelegator);
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
  rootDelegator?: EventDelegator
): Node | null {
  let domNode: Node | null = null;

  createEffect(() => {
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
 * 
 * @param items - Array of VNodes to render
 * @param vnode - Original function that returned the items
 * @param parent - Parent DOM node
 * @param domNode - Reference to the current DOM node (will be updated)
 * @param oldNode - Node to replace (if any)
 * @param rootDelegator - Event delegator
 */
function renderListComponent(
  items: VNode[],
  vnode: () => unknown,
  parent: Node,
  domNode: Node | null,
  oldNode: Node | null,
  rootDelegator?: EventDelegator
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
    processListItem(key, child, item, state, newKeyToItem, parent, rootDelegator);
  });

  // Clean up removed items
  cleanupRemovedItems(state, newKeyToItem, parent, vnode, rootDelegator);

  // Reorder DOM nodes based on keys
  reorderDOMNodes(newKeys, state.lastKeys, newKeyToItem, parent);

  // Update state for next render
  updateListState(state, newKeyToItem, newKeys, vnode);

  // Update domNode reference
  if (domNode === null && newKeys.length > 0) {
    domNode = state.keyToItem.get(newKeys[0])?.node || null;
  }
}

/**
 * Processes a single list item, either reusing existing or creating new DOM nodes
 */
function processListItem(
  key: string,
  vNode: VNode,
  item: ReactiveObject | undefined,
  state: { keyToItem: Map<string, ListItemState>, lastKeys: string[] },
  newKeyToItem: Map<string, ListItemState>,
  parent: Node,
  rootDelegator?: EventDelegator
): void {
  const existingItem = state.keyToItem.get(key);

  // Fast path: reuse existing item if unchanged
  if (existingItem && item && existingItem.reactiveObj === item && existingItem.vNode === vNode) {
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

  // Setup reactive bindings for function children
  if (!effectCleanup) {
    effectCleanup = setupFunctionChildBindings(vNode, node);
  }

  // Create new node if needed
  if (!node) {
    const newNode = rdom(vNode, parent, null, rootDelegator);
    if (newNode) node = newNode;
  }

  // Store the item if node was created and item exists
  if (node && item) {
    newKeyToItem.set(key, {
      node,
      reactiveObj: item,
      vNode,
      effectCleanup
    });
  }
}

/**
 * Sets up reactive bindings for function children in a VNode
 */
function setupFunctionChildBindings(vNode: VNode, node: Node | undefined): (() => void) | undefined {
  let effectCleanup: (() => void) | undefined;

  const childNodes = vNode.children || [];
  childNodes.forEach((childNode, childIndex) => {
    if (isFunction(childNode)) {
      effectCleanup = createEffect(() => {
        const childValue = childNode();
        if (node && node.childNodes[childIndex]) {
          node.childNodes[childIndex].textContent = String(childValue);
        }
      });
    }
  });

  return effectCleanup;
}

/**
 * Cleans up items that are no longer in the list
 */
function cleanupRemovedItems(
  state: { keyToItem: Map<string, ListItemState>, lastKeys: string[] },
  newKeyToItem: Map<string, ListItemState>,
  parent: Node,
  vnode: () => unknown,
  rootDelegator?: EventDelegator
): void {
  state.keyToItem.forEach((item, key) => {
    if (!newKeyToItem.has(key) && item.node.parentNode === parent) {
      if (item.effectCleanup) item.effectCleanup();
      item.reactiveObj.cleanup();

      if (item.node instanceof HTMLElement && rootDelegator) {
        rootDelegator.removeHandlersForElement(item.node);
      }

      parent.removeChild(item.node);
      cleanupChildVNodes(item.vNode);
      reactiveBindings.delete(vnode);
    }
  });
}

/**
 * Recursively cleans up child VNodes
 */
function cleanupChildVNodes(vnode: VNode): void {
  vnode.children.forEach(child => {
    if (!isString(child) && !isFunction(child)) {
      cleanupChildVNodes(child as VNode);
    }
  });
}

/**
 * Reorders DOM nodes based on key changes
 */
function reorderDOMNodes(
  newKeys: string[],
  lastKeys: string[],
  newKeyToItem: Map<string, ListItemState>,
  parent: Node
): void {
  // Fast path: If array length unchanged, only move changed positions
  if (newKeys.length === lastKeys.length) {
    for (let i = 0; i < newKeys.length; i++) {
      if (newKeys[i] !== lastKeys[i]) {
        updateNodePosition(newKeys[i], newKeyToItem, parent, i);
      }
    }
  } else {
    // Otherwise reorder all elements
    for (let i = 0; i < newKeys.length; i++) {
      updateNodePosition(newKeys[i], newKeyToItem, parent, i);
    }
  }
}

/**
 * Updates the list state for the next render
 */
function updateListState(
  state: { keyToItem: Map<string, ListItemState>, lastKeys: string[] },
  newKeyToItem: Map<string, ListItemState>,
  newKeys: string[],
  vnode: () => unknown
): void {
  state.keyToItem.clear();
  newKeyToItem.forEach((item, key) => state.keyToItem.set(key, item));
  state.lastKeys = newKeys;
  reactiveBindings.set(vnode, state);

  // Clean up if list is empty
  if (newKeys.length === 0) {
    reactiveBindings.delete(vnode);
  }
}

/**
 * Renders a VNode element
 * 
 * @param vnode - VNode to render
 * @param parent - Parent DOM node
 * @param oldNode - Node to replace (if any)
 * @param rootDelegator - Event delegator
 * @returns The created DOM element
 */
function renderVNodeElement(
  vnode: VNode,
  parent: Node,
  oldNode: Node | null,
  rootDelegator?: EventDelegator
): Node | null {
  const { type, props, children } = vnode;

  if (!type) {
    console.warn('Invalid VNode: no type', vnode);
    return null;
  }

  // Create DOM element
  const element = document.createElement(type as keyof HTMLTagName);

  // Setup event delegator
  const delegator = setupEventDelegator(parent, rootDelegator);

  // Apply props to element
  applyPropsToElement(element, props, delegator);

  // Render children
  renderVNodeChildren(element, children, delegator);

  // Add to DOM
  addElementToDOM(element, parent, oldNode, rootDelegator);

  return element;
}

/**
 * Sets up an event delegator for the element
 */
function setupEventDelegator(
  parent: Node,
  rootDelegator?: EventDelegator
): EventDelegator | undefined {
  if (rootDelegator) {
    return rootDelegator;
  }

  if (parent instanceof HTMLElement) {
    return new EventDelegator(parent);
  }

  return undefined;
}

/**
 * Applies props to a DOM element
 */
function applyPropsToElement(
  element: HTMLElement,
  props: VNodeProps<any>,
  delegator?: EventDelegator
): void {
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on') && isFunction(value)) {
      if (delegator && element instanceof HTMLElement) {
        delegator.addHandler(element, key.slice(2).toLowerCase(), value as EventListener);
      }
    } else if (isFunction(value)) {
      createEffect(() => {
        element.setAttribute(key, String(value()));
      });
    } else if (key !== 'key' && key !== 'item') {
      element.setAttribute(key, String(value));
    }
  }
}

/**
 * Renders children of a VNode
 */
function renderVNodeChildren(
  element: HTMLElement,
  children: (VNode | VNodePrimative)[],
  delegator?: EventDelegator
): void {
  children.forEach((child, index) => {
    try {
      rdom(child as VNode, element, null, delegator);
    } catch (e) {
      console.error(`Error rendering child at index ${index}:`, e);
    }
  });
}

/**
 * Adds an element to the DOM, either replacing an existing node or appending
 */
function addElementToDOM(
  element: HTMLElement,
  parent: Node,
  oldNode: Node | null,
  rootDelegator?: EventDelegator
): void {
  if (oldNode) {
    parent.replaceChild(element, oldNode);
    if (oldNode instanceof HTMLElement && rootDelegator) {
      rootDelegator.removeHandlersForElement(oldNode);
    }
  } else {
    parent.appendChild(element);
  }
}

/**
 * Validates if an object is a proper ReactiveObject with required methods
 * 
 * @param item - Object to validate
 * @returns boolean indicating if it's a valid reactive object
 */
function isValidReactiveObject(item: ReactiveObject | undefined): boolean {
  if (!item || typeof item.get !== 'function' || typeof item.set !== 'function') {
    return false;
  }

  try {
    const testKey = Object.keys(item).find(
      key => typeof item[key as keyof typeof item] !== 'function'
    ) as keyof typeof item | undefined;

    if (testKey) {
      const value = item.get(testKey);
      item.set(testKey, value);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates or updates a text node in the DOM
 * 
 * @param text - Text content
 * @param parent - Parent DOM node
 * @param oldNode - Node to replace (if any)
 * @param rootDelegator - Event delegator for cleanup
 * @returns Created or updated DOM node
 */
function createTextNode(
  text: string,
  parent: Node,
  oldNode: Node | null,
  rootDelegator?: EventDelegator
): Node {
  // Fast path: update existing text node
  if (oldNode && oldNode.nodeType === 3) {
    oldNode.textContent = text;
    return oldNode;
  }

  const textNode = document.createTextNode(text);

  // Replace or append
  if (oldNode) {
    parent.replaceChild(textNode, oldNode);
    if (oldNode instanceof HTMLElement && rootDelegator) {
      rootDelegator.removeHandlersForElement(oldNode);
    }
  } else {
    parent.appendChild(textNode);
  }

  return textNode;
}

/**
 * Helper function to update a node's position in the DOM
 */
function updateNodePosition(
  key: string,
  itemMap: Map<string, ListItemState>,
  parent: Node,
  desiredIndex: number
): void {
  const item = itemMap.get(key)!;
  const node = item.node;
  const currentNode = parent.childNodes[desiredIndex];

  if (node !== currentNode) {
    parent.insertBefore(node, currentNode || null);
  }
}