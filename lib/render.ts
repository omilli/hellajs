import { effect } from './reactive';
import { EventDelegator } from './events';
import { listMap, setupListBindings } from './foreach';
import type { ComponentContext, HTMLTagName, ListItem, VNode } from './types';

export const rootRegistry = new Map<string, EventDelegator>();

export function render(
  vNode: VNode | string | (() => unknown),
  rootSelector: string = "#app"
): Node | null {
  const root = document.querySelector(rootSelector) as HTMLElement;
  rootRegistry.set(rootSelector, new EventDelegator(rootSelector));
  return createElement(vNode, root, rootSelector);
}

export function createElement(
  vNode: VNode | string | (() => unknown),
  parent: Node,
  rootSelector: string
): Node | null {
  if (typeof vNode === 'string' || typeof vNode === 'number') {
    const text = vNode;
    const textNode = document.createTextNode(text);
    parent.appendChild(textNode);
    return textNode;
  }

  if (typeof vNode === 'function') {
    return renderComponent(vNode, parent, rootSelector);
  }

  const { tag, props, children } = vNode;

  if (!tag) {
    return null;
  }

  const element = document.createElement(tag as keyof HTMLTagName);
  const delegator = rootRegistry.get(rootSelector);
  const keys = Object.keys(props);
  const keyLen = keys.length;

  let context = props.__componentContext as ComponentContext;

  for (let i = 0; i < keyLen; i++) {
    const key = keys[i];
    const value = props[key];

    if (key === 'key' || key === '__componentContext') {
      continue;
    }

    if (typeof value === 'function') {
      if (key.startsWith('on')) {
        delegator?.addHandler(element, key.slice(2), value as EventListener);
        if (context) {
          context.effects.add(() => {
            delegator?.removeHandlersForElement(element);
          });
        }
      } else {
        effect(() => element.setAttribute(key, value() as string));
      }
    } else {
      element.setAttribute(key, value as string);
    }
  }

  const len = children.length;
  if (len > 1) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < len; i++) {
      createElement(children[i] as VNode, element, rootSelector)
    }
    element.appendChild(fragment);
  } else if (len === 1) {
    createElement(children[0] as VNode, element, rootSelector)
  }

  parent.appendChild(element);
  return element;
}

function renderComponent(
  vNode: () => unknown,
  parent: Node,
  rootSelector: string
): Node | null {
  let domNode: Node | null = null;

  effect(() => {
    const value = vNode();

    if (Array.isArray(value)) {
      renderForEach(value as VNode[], vNode, parent, domNode, rootSelector);
    } else if (value && typeof value === 'object' && 'tag' in value) {
      if (domNode && domNode.parentNode) {
        const newNode = createElement(value as VNode, parent, rootSelector);
        if (newNode) {
          parent.replaceChild(newNode, domNode);
          domNode = newNode;
        }
      } else {
        domNode = createElement(value as VNode, parent, rootSelector);
      }
    } else {
      const textContent = String(value);
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

function renderForEach(
  items: VNode[],
  vNode: () => unknown,
  parent: Node,
  domNode: Node | null,
  rootSelector: string
): void {
  const state = listMap.get(vNode) || {
    keyToItem: new Map<string, ListItem>(),
    lastKeys: []
  };

  const newKeys: string[] = [];
  const newKeyToItem = new Map<string, ListItem>();
  const fragment = document.createDocumentFragment();

  // Step 1: Process all items, render new ones, and prepare the fragment
  for (let index = 0, len = items.length; index < len; index++) {
    const child = items[index];
    const key = child.props.key as string;

    if (!key) continue;

    newKeys.push(key);

    const existingItem = state.keyToItem.get(key);

    if (existingItem && existingItem.node.parentNode === parent) {
      newKeyToItem.set(key, existingItem);
      fragment.appendChild(existingItem.node); // Reuse existing node
      continue;
    }

    let node = existingItem?.node;
    let effectCleanup = existingItem?.effectCleanup;

    if (effectCleanup && !node) {
      effectCleanup();
      effectCleanup = undefined;
    }

    if (!effectCleanup) {
      effectCleanup = setupListBindings(child, node!);
    }

    if (!node) {
      const newNode = createElement(child, fragment, rootSelector);
      if (newNode) node = newNode;
    }

    if (node) {
      newKeyToItem.set(key, {
        node,
        effectCleanup
      });
      fragment.appendChild(node); // Add to fragment
    }
  }

  // Step 2: Clean up removed items
  for (const [key, item] of state.keyToItem) {
    if (!newKeyToItem.has(key) && item.node.parentNode === parent) {
      if (item.effectCleanup) item.effectCleanup();
      const context = (item.node as any).__componentContext as ComponentContext | undefined;
      if (context) context.cleanup();

      if (item.node instanceof HTMLElement) {
        const delegator = rootRegistry.get(rootSelector);
        delegator?.removeHandlersForElement(item.node);
      }
      // Node is not appended to fragment, effectively removing it
    }
  }

  // Step 3: Replace parent's children with the batched fragment
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
  parent.appendChild(fragment);

  // Step 4: Update state
  state.keyToItem.clear();
  state.lastKeys = newKeys;
  listMap.set(vNode, state);

  for (const [key, item] of newKeyToItem) {
    state.keyToItem.set(key, item);
  }

  if (newKeys.length === 0) {
    listMap.delete(vNode);
  }

  if (domNode === null && newKeys.length > 0) {
    domNode = state.keyToItem.get(newKeys[0])?.node || null;
  }
}