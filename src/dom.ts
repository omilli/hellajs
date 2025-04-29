import { type ReactiveObject, createEffect, type ListItemState } from './reactive';
import { html, type HTMLTagName } from './html';
import { type HTMLAttributes } from './types/attributes';
import { EventDelegator } from './events';

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
    // Fast path: direct string rendering
    if (typeof vnode === 'string') {
      return createTextNode(vnode, parent, oldNode, rootDelegator);
    }

    // Functional components
    if (typeof vnode === 'function') {
      let domNode: Node | null = null;

      createEffect(() => {
        const value = vnode();

        // Handle array results (lists)
        if (Array.isArray(value)) {
          const state = reactiveBindings.get(vnode) || {
            keyToItem: new Map<string, ListItemState>,
            lastKeys: []
          };

          const newKeys: string[] = [];
          const newKeyToItem = new Map<string, ListItemState>();

          // Process each item in the array
          value.forEach((child: VNode, index) => {
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
            const existingItem = state.keyToItem.get(key);

            // Fast path: reuse existing item if unchanged
            if (existingItem && item && existingItem.reactiveObj === item && existingItem.vNode === child) {
              newKeyToItem.set(key, existingItem);
            } else {
              let node = existingItem?.node;
              let effectCleanup = existingItem?.effectCleanup;
              const vNode = child;

              // Clean up existing effect if reactive object changed
              if (effectCleanup && item !== existingItem?.reactiveObj) {
                effectCleanup();
                effectCleanup = undefined;
              }

              // Setup reactive bindings for function children
              if (!effectCleanup) {
                const childNodes = vNode.children || [];
                childNodes.forEach((childNode, childIndex) => {
                  if (typeof childNode === 'function') {
                    effectCleanup = createEffect(() => {
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
          });

          // Remove nodes no longer in the list
          state.keyToItem.forEach((item, key) => {
            if (!newKeyToItem.has(key) && item.node.parentNode === parent) {
              if (item.effectCleanup) item.effectCleanup();
              item.reactiveObj.cleanup();

              if (item.node instanceof HTMLElement && rootDelegator) {
                rootDelegator.removeHandlersForElement(item.node);
              }

              parent.removeChild(item.node);

              // Clean up child nodes recursively
              const clearChildren = (vnode: VNode) => {
                vnode.children.forEach(child => {
                  if (typeof child !== 'string' && typeof child !== 'function') {
                    clearChildren(child as VNode);
                  }
                });
              };

              clearChildren(item.vNode);
              reactiveBindings.delete(vnode);
            }
          });

          // Optimize DOM operations based on key changes
          // Fast path: If array length unchanged, only move changed positions
          if (newKeys.length === state.lastKeys.length) {
            for (let i = 0; i < newKeys.length; i++) {
              if (newKeys[i] !== state.lastKeys[i]) {
                updateNodePosition(newKeys[i], newKeyToItem, parent, i);
              }
            }
          } else {
            // Otherwise reorder all elements
            for (let i = 0; i < newKeys.length; i++) {
              updateNodePosition(newKeys[i], newKeyToItem, parent, i);
            }
          }

          // Update state for next render
          state.keyToItem.clear();
          newKeyToItem.forEach((item, key) => state.keyToItem.set(key, item));
          state.lastKeys = newKeys;
          reactiveBindings.set(vnode, state);

          // Set domNode reference for first render
          if (!domNode) {
            domNode = state.keyToItem.get(newKeys[0])?.node || null;
          }

          // Clean up if list is empty
          if (newKeys.length === 0) {
            reactiveBindings.delete(vnode);
          }
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

    // Handle VNode objects
    const { type, props, children } = vnode as VNode;
    if (!type) {
      console.warn('Invalid VNode: no type', vnode);
      return null;
    }

    // Create DOM element
    const element = document.createElement(type as keyof HTMLTagName);

    // Setup event delegator
    let delegator = rootDelegator;
    if (!delegator && parent instanceof HTMLElement) {
      delegator = new EventDelegator(parent);
    }

    // Apply props to element
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith('on') && typeof value === 'function') {
        if (delegator && element instanceof HTMLElement) {
          delegator.addHandler(element, key.slice(2).toLowerCase(), value as EventListener);
        }
      } else if (typeof value === 'function') {
        createEffect(() => {
          element.setAttribute(key, String(value()));
        });
      } else if (key !== 'key' && key !== 'item') {
        element.setAttribute(key, String(value));
      }
    }

    // Render children
    children.forEach((child, index) => {
      try {
        rdom(child as VNode, element, null, delegator);
      } catch (e) {
        console.error(`Error rendering child at index ${index}:`, e);
      }
    });

    // Add to DOM
    if (oldNode) {
      parent.replaceChild(element, oldNode);
      if (oldNode instanceof HTMLElement && rootDelegator) {
        rootDelegator.removeHandlersForElement(oldNode);
      }
    } else {
      parent.appendChild(element);
    }

    return element;

  } catch (e) {
    console.error('rdom error:', e);
    return null;
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

