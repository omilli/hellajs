import { effect, type Signal } from './reactive';
import { html, type HTMLTagName } from './html';
import { type HTMLAttributes } from './types/attributes';
import { EventDelegator } from './events';

export interface VNode<T extends HTMLTagName = HTMLTagName> {
  type?: T;
  props: VNodeProps<T>;
  children: VNodeValue[];
  __item?: any;
}

export type VNodeProps<T extends HTMLTagName = HTMLTagName> = HTMLAttributes<T> & {
  key?: string | number;
};

export type VNodePrimative<T = unknown> = string | number | boolean | (() => T);

export type VNodeValue = VNode | VNodePrimative;

export interface ListStore {
  node: Node;
  effectCleanup?: () => void;
}

const rootRegistry = new Map<string, EventDelegator>();

const reactiveBindings = new WeakMap<() => unknown, {
  keyToItem: Map<string, ListStore>,
  lastKeys: string[]
}>();

export { html };

export function render(
  vNode: VNode | string | (() => unknown),
  rootSelector: string = "#app"
): Node | null {
  const root = document.querySelector(rootSelector) as HTMLElement;
  rootRegistry.set(rootSelector, new EventDelegator(rootSelector));
  return renderToDOM(vNode, root, rootSelector);
}

function renderToDOM(
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
    return renderFunctionalComponent(vNode, parent, rootSelector);
  }

  const { type, props, children } = vNode;

  if (!type) {
    return null;
  }

  const element = document.createElement(type as keyof HTMLTagName);
  const delegator = rootRegistry.get(rootSelector);
  const keys = Object.keys(props);
  const keyLen = keys.length;

  for (let i = 0; i < keyLen; i++) {
    const key = keys[i];
    const value = props[key];

    if (key === 'key') {
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

  const len = children.length;
  if (len > 1) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < len; i++) {
      renderChild(children[i] as VNode, fragment, rootSelector);
    }
    element.appendChild(fragment);
  } else if (len === 1) {
    renderChild(children[0] as VNode, element, rootSelector);
  }

  parent.appendChild(element);
  return element;
}

function renderChild(child: VNode, element: Node, rootSelector: string): void {
  try {
    renderToDOM(child, element, rootSelector);
  } catch (e) {
    // Error handling silently
  }
}

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

function extractKeyFromItem(child: VNode, index: number): string | null {
  let key: string | null = null;
  let storeItem: Signal<{}> | undefined;

  if ('__item' in child) {
    storeItem = child.__item as Signal<{}>;

    if ('key' in storeItem) {
      key = child.props.key as string;
    } else if ('id' in storeItem) {
      key = (storeItem as unknown as { id: string | number }).id as string;
    }
  }

  return key;
}

function setupFunctionChildBindings(child: VNode, node: Node): (() => void) | undefined {
  const childNodes = child.children || [];
  for (let i = 0, len = childNodes.length; i < len; i++) {
    const childNode = childNodes[i];
    if (typeof childNode === 'function') {
      effect(() => {
        const childValue = childNode();
        if (node && node.childNodes[i]) {
          node.childNodes[i].textContent = childValue as string;
        }
      });
    }
  }
  return undefined;
}

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
    const key = extractKeyFromItem(child, index);

    if (!key) continue;

    newKeys.push(key);

    const existingItem = state.keyToItem.get(key);

    if (existingItem && existingItem.node.parentNode === parent) {
      newKeyToItem.set(key, existingItem);
      continue;
    }

    let node = existingItem?.node;
    let effectCleanup = existingItem?.effectCleanup;

    if (effectCleanup && !node) {
      effectCleanup();
      effectCleanup = undefined;
    }

    if (!effectCleanup) {
      effectCleanup = setupFunctionChildBindings(child, node!);
    }

    if (!node) {
      const newNode = renderToDOM(child, parent, rootSelector);
      if (newNode) node = newNode;
    }

    if (node) {
      newKeyToItem.set(key, {
        node,
        effectCleanup
      });
    }
  }

  for (const [key, item] of state.keyToItem) {
    if (!newKeyToItem.has(key) && item.node.parentNode === parent) {
      if (item.effectCleanup) item.effectCleanup();

      if (item.node instanceof HTMLElement) {
        const delegator = rootRegistry.get(rootSelector);
        delegator?.removeHandlersForElement(item.node);
      }

      parent.removeChild(item.node);
    }
  }

  reorderDomNodes(parent, newKeys, state.lastKeys, newKeyToItem);

  state.keyToItem.clear();
  state.lastKeys = newKeys;
  reactiveBindings.set(vNode, state);

  for (const [key, item] of newKeyToItem) {
    state.keyToItem.set(key, item);
  }

  if (newKeys.length === 0) {
    reactiveBindings.delete(vNode);
  }

  if (domNode === null && newKeys.length > 0) {
    domNode = state.keyToItem.get(newKeys[0])?.node || null;
  }
}

function reorderDomNodes(
  parent: Node,
  newKeys: string[],
  lastKeys: string[],
  newKeyToItem: Map<string, ListStore>
): void {
  for (let i = 0; i < newKeys.length; i++) {
    if (newKeys.length === lastKeys.length && newKeys[i] === lastKeys[i]) {
      continue;
    }

    const item = newKeyToItem.get(newKeys[i])!;
    const node = item.node;
    const currentNode = parent.childNodes[i];

    if (node !== currentNode) {
      parent.insertBefore(node, currentNode || null);
    }
  }
}

export function List<T extends {}>(
  data: Signal<T[]>,
  mapFn: (item: T, index: number) => VNode
) {
  return () => data().map((item, index) => {
    const node = mapFn(item, index);

    if ('id' in item && !('key' in node.props)) {
      node.props.key = (item as unknown as { id: string | number }).id;
    }

    (node as unknown as VNode & { __item: T }).__item = item;

    return node;
  });
}