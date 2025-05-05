import { effect } from "./reactive";
import type { ContextElement, HTMLTagName, VNode } from "./types";
import { Scope } from "./context";
import { renderFunction, rootRegistry } from "./render";

export interface EventHandler {
  event: string;
  handler: (event: Event) => void;
  element: HTMLElement;
}

export class EventDelegator {
  private handlers: Map<Element, Map<string, (event: Event) => void>> = new Map();
  private rootSelector: string;
  private root: HTMLElement;
  private activeEvents: Set<string> = new Set();
  private eventListeners: Map<string, (e: Event) => void> = new Map();

  constructor(rootSelector: string) {
    this.rootSelector = rootSelector;
    this.root = document.querySelector(this.rootSelector) as HTMLElement;
  }

  addHandler(element: Element, event: string, handler: (event: Event) => void) {
    let eventHandlers = this.handlers.get(element);
    if (!eventHandlers) {
      eventHandlers = new Map();
      this.handlers.set(element, eventHandlers);
    }

    eventHandlers.set(event, handler);
    this.setupEventListener(event);
  }

  removeHandlersForElement(element: Element) {
    const eventHandlers = this.handlers.get(element);
    if (eventHandlers) {
      for (const [event] of eventHandlers) {
        if (!Array.from(this.handlers.values()).some(h => h.has(event))) {
          const listener = this.eventListeners.get(event);
          if (listener) {
            this.root?.removeEventListener(event, listener);
            this.eventListeners.delete(event);
          }
          this.activeEvents.delete(event);
        }
      }

      this.handlers.delete(element);
    }
  }

  cleanup() {
    this.handlers.clear();

    for (const [event, listener] of this.eventListeners.entries()) {
      this.root?.removeEventListener(event, listener);
    }

    this.eventListeners.clear();
    this.activeEvents.clear();
  }

  private setupEventListener(event: string) {
    if (!this.activeEvents.has(event)) {
      const listener = (e: Event) => {
        let target = e.target as Element;
        let depth = 0;

        while (target && target !== this.root && depth < 3) {
          const eventHandlers = this.handlers.get(target);
          if (eventHandlers) {
            const handler = eventHandlers.get(event);
            if (handler) {
              handler(e);
              return;
            }
          }
          target = target.parentElement as Element;
          depth++;
        }
      };

      this.eventListeners.set(event, listener);
      this.root?.addEventListener(event, listener);
      this.activeEvents.add(event);
    }
  }
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
    return renderFunction(vNode, parent, rootSelector);
  }

  const { tag, props, children } = vNode;

  if (!tag) {
    return null;
  }

  const element = document.createElement(tag as keyof HTMLTagName);
  const delegator = rootRegistry.get(rootSelector);
  const keys = Object.keys(props);
  const keyLen = keys.length;

  let context = props._context as Scope;

  for (let i = 0; i < keyLen; i++) {
    const key = keys[i];
    const value = props[key];

    if (key === 'key' || key === '_context') {
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
      createElement(children[i] as VNode, fragment, rootSelector);
    }
    element.appendChild(fragment);
  } else if (len === 1) {
    createElement(children[0] as VNode, element, rootSelector);
  }

  parent.appendChild(element);
  return element;
}

export interface ListItem {
  node: Node;
  effectCleanup?: () => void;
}

export interface ListState {
  keyToItem: Map<string, ListItem>;
  lastKeys: string[];
}

export const listMap = new WeakMap<() => unknown, ListState>();

export function bindList(child: VNode, node: Node): (() => void) | undefined {
  const childNodes = child.children || [];
  const cleanups: (() => void)[] = [];
  for (let i = 0; i < childNodes.length; i++) {
    const childNode = childNodes[i];
    if (typeof childNode === "function") {
      const cleanup = effect(() => {
        const value = childNode();
        if (node.childNodes[i]) {
          node.childNodes[i].textContent = value as string;
        }
      });
      cleanups.push(cleanup);
    }
  }
  return cleanups.length > 0 ? () => cleanups.forEach((c) => c()) : undefined;
}

export function createOrReuseItem(
  child: VNode,
  parent: Node,
  rootSelector: string,
  existingItem?: ListItem
): ListItem | undefined {
  let node = existingItem?.node;
  let effectCleanup = existingItem?.effectCleanup;

  if (effectCleanup && !node) {
    effectCleanup();
    effectCleanup = undefined;
  }

  if (!effectCleanup) {
    effectCleanup = bindList(child, node!);
  }

  if (!node) {
    node = createElement(child, parent, rootSelector) as Node;
  }

  return node ? { node, effectCleanup } : undefined;
}

export function removeItem(
  item: ListItem,
  parent: Node,
  delegator: { removeHandlersForElement: (el: HTMLElement) => void }
): void {
  if (item.node.parentNode === parent) {
    if (item.effectCleanup) item.effectCleanup();
    const context = (item.node as ContextElement)._context;
    if (context) context.cleanup();
    if (item.node instanceof HTMLElement) {
      delegator?.removeHandlersForElement(item.node);
    }
    parent.removeChild(item.node);
  }
}

export function reorderList(
  parent: Node,
  newKeys: string[],
  newKeyToItem: Map<string, ListItem>
): void {
  for (let i = 0; i < newKeys.length; i++) {
    const key = newKeys[i];
    const item = newKeyToItem.get(key)!;
    const currentNode = parent.childNodes[i];
    if (item.node !== currentNode) {
      parent.insertBefore(item.node, currentNode || null);
    }
  }
}