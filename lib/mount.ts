import { setNodeHandler } from "./events";
import { effect, pushScope, popScope, type EffectScope } from "./reactive";
import type { VNode, VNodeValue } from "./types";
import { nodeRegistry, cleanNodeRegistry, addRegistryEffect } from "./registry";

export function mount(vNode: VNode | (() => VNode) | (() => () => VNode)) {
  if (typeof vNode === "function") {
    vNode = vNode();
  }

  const root = document.querySelector("#app");
  const element = renderVNode(vNode as VNode);
  root?.replaceChildren(element);
}

export function resolveNode(value: VNodeValue): Node {
  if (isText(value)) {
    return document.createTextNode(String(value));
  } else if (isVNode(value)) {
    return renderVNode(value);
  } else if (value instanceof Node) {
    return value;
  } else {
    return document.createComment("empty");
  }
}

function renderVNode(vNode: VNode): HTMLElement {
  while (isFunction(vNode)) {
    vNode = vNode() as VNode;
  }
  const { tag, props, children } = vNode;
  const element = document.createElement(tag as string);

  pushScope<EffectScope>({
    registerEffect: (cleanup: () => void) => {
      addRegistryEffect(element, cleanup);
    }
  });


  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key.startsWith("on")) {
        const event = key.slice(2).toLowerCase();
        setNodeHandler(element, event, value as EventListener);
        return;
      }

      if (isFunction(value)) {
        const propCleanup = effect(() => {
          renderProps(element, key, value());
          cleanNodeRegistry();
        });
        addRegistryEffect(element, propCleanup);
        return;
      }

      renderProps(element, key, value);
    });
  }

  children?.forEach((child) => handleChild(element, element, child));

  popScope();

  return element;
}

function resolveValue(value: unknown): unknown {
  while (isFunction(value)) {
    value = value();
  }
  return value;
}

function handleChild(root: HTMLElement, element: HTMLElement | DocumentFragment, child: VNodeValue) {
  if (isFunction(child) && child.length === 1) {
    child(element);
    return;
  }

  if (isFunction(child)) {
    const placeholder = document.createComment("dynamic");
    element.append(placeholder);
    let currentNode: Node | null = null;

    const cleanup = effect(() => {
      const value = resolveValue(child);
      let newNode: Node;

      if (isText(value)) {
        newNode = document.createTextNode(String(value));
      } else if (isVNode(value)) {
        newNode = renderVNode(value);
      } else {
        newNode = document.createComment("empty");
      }

      if (currentNode && currentNode.parentNode === element) {
        cleanNodeRegistry(currentNode);
        element.replaceChild(newNode, currentNode);
      } else if (placeholder.parentNode === element) {
        element.replaceChild(newNode, placeholder);
      }
      currentNode = newNode;
      cleanNodeRegistry();
    });

    addRegistryEffect(root, cleanup);
    return;
  }

  const resolved = resolveValue(child);

  if (isText(resolved)) {
    renderText(element, resolved);
    return;
  }

  if (resolved instanceof Node) {
    element.append(resolved);
    return;
  }

  if (isVNode(resolved)) {
    element.append(renderVNode(resolved));
  }
}

function renderProps(element: HTMLElement, key: string, value: unknown) {
  if (key in element) {
    // @ts-ignore
    element[key] = value;
  } else {
    element.setAttribute(key, value as string);
  }
}

function renderText(element: HTMLElement | DocumentFragment, text: VNodeValue) {
  const textNode = document.createTextNode(text as string);
  element.append(textNode);
}

export function isText(vNode: unknown): vNode is string | number {
  return typeof vNode === "string" || typeof vNode === "number";
}

export function isFunction(vNode: unknown): vNode is (...args: unknown[]) => unknown {
  return typeof vNode === "function";
}

export function isVNode(vNode: unknown): vNode is VNode {
  return (vNode && typeof vNode === "object" && "tag" in vNode) as boolean;
}