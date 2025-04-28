import { type ReactiveObject, createEffect, type ListItemState } from './reactive';
import { html, type HTMLTagName } from './html';
import { type HTMLAttributes, type HTMLAttributeMap } from './types/attributes';
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

export type VNodePrimative<T = unknown> = string | number | boolean | (() => T)

export type VNodeValue = VNode | VNodePrimative;

export interface CachedNode {
  domNode: Node;
}

const vdomObjectCache = new WeakMap<VNode | (() => unknown), CachedNode>();
const vdomStringCache = new Map<string, CachedNode>();
const reactiveBindings = new WeakMap<() => unknown, { keyToItem: Map<string, ListItemState>; lastKeys: string[] }>();
const delegatorCache = new WeakMap<Node, EventDelegator>();
const MAX_CACHE_SIZE = 1000; // Limit vdomStringCache size

function isValidReactiveObject(item: ReactiveObject | undefined): boolean {
  if (!item || typeof item.get !== 'function' || typeof item.set !== 'function') {
    return false;
  }
  try {
    const testKey = Object.keys(item).find(key => typeof item[key as keyof typeof item] !== 'function') as keyof typeof item | undefined;
    if (testKey) {
      const value = item.get(testKey);
      item.set(testKey, value);
    }
    return true;
  } catch {
    return false;
  }
}

export function rdom(
  vnode: VNode | string | (() => unknown),
  parent: Node,
  oldNode: Node | null = null,
  rootDelegator?: EventDelegator
): Node | null {
  try {
    if (typeof vnode !== 'function') {
      if (typeof vnode === 'string') {
        const cached = vdomStringCache.get(vnode);
        if (cached) {
          if (oldNode && oldNode !== cached.domNode) {
            parent.replaceChild(cached.domNode, oldNode);
            if (oldNode instanceof HTMLElement && delegatorCache.has(parent)) {
              delegatorCache.get(parent)!.removeHandlersForElement(oldNode);
            }
            vdomStringCache.delete(vnode);
          } else if (!oldNode) {
            parent.appendChild(cached.domNode);
          }
          return cached.domNode;
        }
        const textNode = document.createTextNode(vnode);
        if (oldNode && oldNode.nodeType === 3) {
          oldNode.textContent = vnode;
          vdomStringCache.set(vnode, { domNode: oldNode });
          // Evict old entries if cache grows too large
          if (vdomStringCache.size > MAX_CACHE_SIZE) {
            const firstKey = vdomStringCache.keys().next().value;
            vdomStringCache.delete(firstKey as string);
          }
          return oldNode;
        }
        parent.appendChild(textNode);
        vdomStringCache.set(vnode, { domNode: textNode });
        if (vdomStringCache.size > MAX_CACHE_SIZE) {
          const firstKey = vdomStringCache.keys().next().value;
          vdomStringCache.delete(firstKey as string);
        }
        return textNode;
      }
      if (vdomObjectCache.has(vnode)) {
        const cached = vdomObjectCache.get(vnode)!;
        if (oldNode && oldNode !== cached.domNode) {
          parent.replaceChild(cached.domNode, oldNode);
          if (oldNode instanceof HTMLElement && delegatorCache.has(parent)) {
            delegatorCache.get(parent)!.removeHandlersForElement(oldNode);
          }
        } else if (!oldNode) {
          parent.appendChild(cached.domNode);
        }
        return cached.domNode;
      }
    }

    if (typeof vnode === 'function') {
      let domNode: Node | null = null;
      createEffect(() => {
        const value = vnode();
        if (Array.isArray(value)) {
          const state = reactiveBindings.get(vnode) || { keyToItem: new Map<string, ListItemState>, lastKeys: [] };
          const newKeys: string[] = [];
          const newKeyToItem = new Map<string, ListItemState>();
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
            if (existingItem && item && existingItem.reactiveObj === item && existingItem.vNode === child) {
              newKeyToItem.set(key, existingItem);
            } else {
              let node = existingItem?.node;
              let effectCleanup = existingItem?.effectCleanup;
              const vNode = child;
              if (effectCleanup && item !== existingItem?.reactiveObj) {
                effectCleanup();
                effectCleanup = undefined;
              }
              if (!node) {
                const newNode = rdom(vNode, parent, null, rootDelegator);
                if (newNode) node = newNode;
              }
              if (node && item) {
                newKeyToItem.set(key, { node, reactiveObj: item, vNode });
              }
            }
          });
          state.keyToItem.forEach((item, key) => {
            if (!newKeyToItem.has(key) && item.node.parentNode === parent) {
              if (item.effectCleanup) item.effectCleanup();
              item.reactiveObj.cleanup();
              if (item.node instanceof HTMLElement && rootDelegator) {
                rootDelegator.removeHandlersForElement(item.node);
              }
              parent.removeChild(item.node);
              const clearChildren = (vnode: VNode) => {
                vdomObjectCache.delete(vnode);
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
          if (newKeys.length === state.lastKeys.length) {
            for (let i = 0; i < newKeys.length; i++) {
              if (newKeys[i] !== state.lastKeys[i]) {
                const key = newKeys[i];
                const item = newKeyToItem.get(key)!;
                const node = item.node;
                const currentNode = parent.childNodes[i];
                if (node !== currentNode) {
                  parent.insertBefore(node, currentNode || null);
                }
              }
            }
          } else {
            for (let i = 0; i < newKeys.length; i++) {
              const key = newKeys[i];
              const item = newKeyToItem.get(key)!;
              const node = item.node;
              const currentNode = parent.childNodes[i];
              if (node !== currentNode) {
                parent.insertBefore(node, currentNode || null);
              }
            }
          }
          state.keyToItem.clear();
          newKeyToItem.forEach((item, key) => state.keyToItem.set(key, item));
          state.lastKeys = newKeys;
          reactiveBindings.set(vnode, state);
          if (!domNode) {
            domNode = state.keyToItem.get(newKeys[0])?.node || null;
          }
          if (newKeys.length === 0) {
            reactiveBindings.delete(vnode);
          }
        } else {
          const textContent = String(value);
          if (!domNode) {
            domNode = document.createTextNode(textContent);
            if (oldNode) {
              parent.replaceChild(domNode, oldNode);
              vdomStringCache.delete(textContent);
            } else {
              parent.appendChild(domNode);
            }
            vdomObjectCache.set(vnode, { domNode });
          } else {
            domNode.textContent = textContent;
          }
        }
      });
      return domNode;
    }

    if (typeof vnode === 'string') {
      const textNode = document.createTextNode(vnode);
      if (oldNode && oldNode.nodeType === 3) {
        oldNode.textContent = vnode;
        vdomStringCache.set(vnode, { domNode: oldNode });
        if (vdomStringCache.size > MAX_CACHE_SIZE) {
          const firstKey = vdomStringCache.keys().next().value;
          vdomStringCache.delete(firstKey as string);
        }
        return oldNode;
      }
      parent.appendChild(textNode);
      vdomStringCache.set(vnode, { domNode: textNode });
      if (vdomStringCache.size > MAX_CACHE_SIZE) {
        const firstKey = vdomStringCache.keys().next().value;
        vdomStringCache.delete(firstKey as string);
      }
      return textNode;
    }

    const { type, props, children } = vnode as VNode;
    if (!type) {
      console.warn('Invalid VNode: no type', vnode);
      return null;
    }

    const element = document.createElement(type as keyof HTMLTagName);
    let delegator = rootDelegator;
    if (!delegator && parent instanceof HTMLElement) {
      if (!delegatorCache.has(parent)) {
        delegatorCache.set(parent, new EventDelegator(parent));
      }
      delegator = delegatorCache.get(parent);
    }

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
    children.forEach((child, index) => {
      try {
        rdom(child as VNode, element, null, delegator);
      } catch (e) {
        console.error(`Error rendering child at index ${index}:`, e);
      }
    });
    if (oldNode) {
      parent.replaceChild(element, oldNode);
      if (oldNode instanceof HTMLElement && delegatorCache.has(parent)) {
        delegatorCache.get(parent)!.removeHandlersForElement(oldNode);
      }
    } else {
      parent.appendChild(element);
    }
    if (parent === document.getElementById('app')) {
      vdomObjectCache.set(vnode, { domNode: element });
    }
    return element;
  } catch (e) {
    console.error('rdom error:', e);
    return null;
  }
}

export { html };