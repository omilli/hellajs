import { setNodeHandler } from "./events";
import { effect, pushScope, popScope, type EffectScope } from "@hellajs/core";
import type { VNode, VNodeValue } from "./types";
import { cleanNodeRegistry, addRegistryEffect } from "./registry";

export function mount(vNode: VNode | (() => VNode), rootSelector: string = "#app") {
  if (typeof vNode === "function") vNode = vNode();
  document.querySelector(rootSelector)?.replaceChildren(renderVNode(vNode));
}

export function resolveNode(value: VNodeValue): Node {
  switch (true) {
    case isText(value):
      return document.createTextNode(value as string);
    case isVNode(value):
      return renderVNode(value);
    case value instanceof Node:
      return value;
  }

  return document.createComment("empty");
}

function renderVNode(vNode: VNode): HTMLElement {
  const { tag, props, children } = vNode;
  const element = document.createElement(tag as string);

  pushScope<EffectScope>({
    registerEffect: (cleanup: () => void) => {
      addRegistryEffect(element, cleanup);
    }
  });

  if (props && "html" in props) {
    // Support dynamic html prop (functions, signals, etc.)
    if (isFunction(props.html)) {
      addRegistryEffect(element, effect(() => {
        // Remove all children before inserting new HTML
        element.replaceChildren();
        element.append(rawHtmlElement(String(resolveValue(props.html))));
        cleanNodeRegistry();
      }));
    } else {
      element.append(rawHtmlElement(String(resolveValue(props.html))));
    }
  } else if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key === "html") return; // already handled above

      if (key.startsWith("on")) {
        return setNodeHandler(element, key.slice(2).toLowerCase(), value as EventListener);
      }

      if (isFunction(value)) {
        return addRegistryEffect(element, effect(() => {
          renderProps(element, key, value());
          cleanNodeRegistry();
        }));
      }

      renderProps(element, key, value);
    });
  }

  children?.forEach((child) => {
    if (isFunction(child) && child.length === 1) return child(element)

    if (isFunction(child)) {
      const placeholder = document.createComment("dynamic");
      element.append(placeholder);
      let currentNode: Node | null = null;

      return addRegistryEffect(element, effect(() => {
        const value = resolveValue(child);
        let newNode = resolveNode(value);
        let replaceNode = currentNode && currentNode.parentNode === element ? currentNode : placeholder;
        element.replaceChild(newNode, replaceNode as Node);
        currentNode = newNode;
        cleanNodeRegistry();
      }));
    }

    const resolved = resolveValue(child);

    switch (true) {
      case isText(resolved):
        return element.append(document.createTextNode(resolved as string));
      case isRawHtml(resolved):
        return element.append(rawHtmlElement(resolved.html));
      case resolved instanceof Node:
        return element.append(resolved);
      case isVNode(resolved):
        element.append(renderVNode(resolved));
    }
  });

  popScope();

  return element;
}

function resolveValue(value: unknown): unknown {
  while (isFunction(value)) {
    value = value();
  }
  return value;
}

function renderProps(element: HTMLElement, key: string, value: unknown) {
  if (key in element) {
    // @ts-ignore
    element[key] = value;
  } else {
    element.setAttribute(key, value as string);
  }
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

function rawHtmlElement(htmlString: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = (htmlString ?? '').toString().trim();
  return template.content;
}

function isRawHtml(value: unknown): value is { html: string } {
  return typeof value === 'object' && value !== null && 'html' in value && typeof (value as { html: string }).html === 'string';
}
