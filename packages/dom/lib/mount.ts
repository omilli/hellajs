import { setNodeHandler } from "./events";
import { effect } from "@hellajs/core";
import type { VNode, VNodePrimative, VNodeValue } from "./types";
import { cleanNodeRegistry, addRegistryEffect } from "./registry";

export function mount(vNode: VNode | (() => VNode), rootSelector: string = "#app") {
  if (isFunction(vNode)) vNode = vNode();
  document.querySelector(rootSelector)?.replaceChildren(renderVNode(vNode));
}

export function mergeProps<T extends Record<string, any>>(base: T, override: T): T {
  const result: Record<string, any> = { ...base, ...override };

  if (base.class || override.class) {
    const baseClass = resolveClass(base.class);
    const overrideClass = resolveClass(override.class);
    result.class = [...baseClass, ...overrideClass].filter(Boolean).join(" ");
  }

  return result as T;
}


export function resolveNode(value: VNodeValue): Node {
  if (isText(value)) return document.createTextNode(value as string);
  if (isVNode(value)) return renderVNode(value);
  if (value instanceof Node) return value;
  return document.createComment("empty");
}

function resolveClass(value: VNodePrimative): string[] {
  if (Array.isArray(value)) return value.flatMap(resolveClass);
  if (isFunction(value)) return resolveClass(value() as VNodePrimative);
  if (typeof value === "string") return value.split(" ").filter(Boolean);
  if (typeof value === "number") return [String(value)];
  if (!value) return [];
  return [String(value)];
}


function renderVNode(vNode: VNode): HTMLElement | DocumentFragment {
  const { tag, props, children } = vNode;

  if (tag === "$") {
    const fragment = document.createDocumentFragment();
    appendToParent(fragment, children);
    return fragment;
  }

  const element = document.createElement(tag as string);
  const effectFns: (() => void)[] = [];

  if (props && "html" in props) {
    if (isFunction(props.html)) {
      effectFns.push(() => {
        element.replaceChildren();
        element.append(renderHTML(String(resolveValue(props.html))));
        cleanNodeRegistry();
      });
    } else {
      element.append(renderHTML(String(resolveValue(props.html))));
    }
  } else if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key === "html")
        return;
      if (key.startsWith("on"))
        return setNodeHandler(element, key.slice(2).toLowerCase(), value as EventListener);
      if (isFunction(value))
        return effectFns.push(() => renderProps(element, key, value()));

      renderProps(element, key, value);
    });
  }

  appendToParent(element, children, effectFns);

  if (effectFns.length > 0) {
    addRegistryEffect(element, effect(() => effectFns.forEach(fn => fn())));
  }

  return element;
}

function renderHTML(htmlString: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = (htmlString ?? '').toString().trim();
  return template.content;
}

function appendToParent(parent: Node, children?: VNodeValue[], effectFns?: (() => void)[]) {
  children?.forEach((child) => {
    if (isFunction(child) && child.length === 1) {
      if (["parent", "forEach-placeholder"].some(key => child.toString().includes(key)))
        return child(parent);
    }

    if (isFunction(child)) {
      const placeholder = document.createComment("dynamic");
      parent.appendChild(placeholder);
      let currentNode: Node | null = null;

      const childEffectFn = () => {
        const value = resolveValue(child);
        let newNode = resolveNode(value);
        let replaceNode = currentNode && currentNode.parentNode === parent ? currentNode : placeholder;
        parent.replaceChild(newNode, replaceNode as Node);
        currentNode = newNode;
      };

      if (effectFns)
        effectFns.push(childEffectFn);
      else
        addRegistryEffect(parent, effect(childEffectFn));

      return;
    }

    const resolved = resolveValue(child);

    if (isText(resolved))
      return parent.appendChild(document.createTextNode(resolved as string));

    if (isRawHtml(resolved))
      return parent.appendChild(renderHTML(resolved.html));

    if (resolved instanceof Node)
      return parent.appendChild(resolved);

    if (isVNode(resolved))
      parent.appendChild(renderVNode(resolved));
  });
}

function renderProps(element: HTMLElement, key: string, value: unknown) {
  if (key === "class" && Array.isArray(value)) {
    element.setAttribute("class", value.filter(Boolean).join(" "));
    return;
  }

  if (key === "children") return;

  if (key in element)
    // @ts-ignore
    element[key] = value;
  else
    element.setAttribute(key, value as string);
}

function resolveValue(value: unknown): unknown {
  if (isFunction(value))
    value = value();
  return value;
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

function isRawHtml(value: unknown): value is { html: string } {
  return typeof value === 'object' && value !== null && 'html' in value && typeof (value as { html: string }).html === 'string';
}
