import { setNodeHandler } from "./events";
import { effect } from "@hellajs/core";
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

function renderVNode(vNode: VNode): HTMLElement | DocumentFragment {
  const { tag, props, children } = vNode;

  if (tag === "$") {
    const fragment = document.createDocumentFragment();
    appendChildrenToParent(fragment, children);
    return fragment;
  }

  const element = document.createElement(tag as string);
  const effectFns: (() => void)[] = [];

  if (props && "html" in props) {
    if (isFunction(props.html)) {
      effectFns.push(() => {
        element.replaceChildren();
        element.append(rawHtmlElement(String(resolveValue(props.html))));
        cleanNodeRegistry();
      });
    } else {
      element.append(rawHtmlElement(String(resolveValue(props.html))));
    }
  } else if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key === "html") return;

      if (key.startsWith("on")) {
        return setNodeHandler(element, key.slice(2).toLowerCase(), value as EventListener);
      }

      if (isFunction(value)) {
        effectFns.push(() => {
          renderProps(element, key, value());
        });
        return;
      }

      renderProps(element, key, value);
    });
  }

  appendChildrenToParent(element, children, effectFns);

  if (effectFns.length > 0) {
    addRegistryEffect(element, effect(() => {
      effectFns.forEach(fn => fn());
    }));
  }

  return element;
}

function appendChildrenToParent(parent: Node, children?: VNodeValue[], effectFns?: (() => void)[]) {
  children?.forEach((child) => {
    if (isFunction(child) && child.length === 1) {
      const funcStr = child.toString();
      if (
        funcStr.includes('parent') ||
        funcStr.includes('forEach-placeholder') ||
        funcStr.includes('show-placeholder')
      ) {
        return child(parent);
      }
    }

    if (isFunction(child)) {
      const placeholder = document.createComment("dynamic");
      parent.appendChild(placeholder);
      let currentNode: Node | null = null;

      // Instead of calling effect here, push the logic to effectFns
      const childEffectFn = () => {
        const value = resolveValue(child);
        let newNode = resolveNode(value);
        let replaceNode = currentNode && currentNode.parentNode === parent ? currentNode : placeholder;
        parent.replaceChild(newNode, replaceNode as Node);
        currentNode = newNode;
      };
      if (effectFns) {
        effectFns.push(childEffectFn);
      } else {
        addRegistryEffect(parent, effect(childEffectFn));
      }
      return;
    }

    const resolved = resolveValue(child);

    switch (true) {
      case isText(resolved):
        return parent.appendChild(document.createTextNode(resolved as string));
      case isRawHtml(resolved):
        return parent.appendChild(rawHtmlElement(resolved.html));
      case resolved instanceof Node:
        return parent.appendChild(resolved);
      case isVNode(resolved):
        parent.appendChild(renderVNode(resolved));
    }
  });
}

export function resolveValue(value: unknown): unknown {
  while (isFunction(value)) {
    value = value();
  }
  return value;
}

function renderProps(element: HTMLElement, key: string, value: unknown) {
  if (key === "class" && Array.isArray(value)) {
    element.setAttribute("class", value.filter(Boolean).join(" "));
    return;
  }
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
