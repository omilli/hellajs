import { isFunction, isObject, isPrimitive, isString } from "../global";
import { Component, HNode, HNodeChildren, HProps, MountTarget } from "../types";
import { textNode } from "./nodes";

export function mount(
  hnode: HNode | Component,
  container: MountTarget
): HTMLElement {
  const mountTarget = resolveMount(container);

  if (isFunction(hnode)) {
    return mountComponent(hnode, mountTarget);
  }

  if (isFunction(hnode.type)) {
    return mount(hnode.type(hnode.props), mountTarget);
  }

  if (isString(hnode.type)) {
    const el = createElement(hnode);
    mountTarget.appendChild(el);
    return el;
  }

  throw new Error("Invalid node type");
}

export function resolveMount(container?: MountTarget): HTMLElement {
  if (!container) throw new Error("Mount target required");

  if (typeof container === "string") {
    const target = document.querySelector(container);
    if (!(target instanceof HTMLElement)) {
      throw new Error(`Mount target not found: ${container}`);
    }
    return target;
  }

  if (container instanceof HTMLElement) return container;
  throw new Error("Invalid render target");
}

function mountComponent(
  component: Component,
  target: HTMLElement
): HTMLElement {
  const result = component();
  if (result instanceof HTMLElement) {
    target.appendChild(result);
    return result;
  }
  return mount(result, target);
}

function createElement(hnode: HNode): HTMLElement {
  const el = document.createElement(hnode.type as string);
  applyProps(el, hnode.props);
  processChildren(el, hnode.children);
  return el;
}

function applyProps(el: HTMLElement, props: HProps = {}): void {
  Object.entries(props).forEach(([key, value]) => {
    if (key === "mount") return;
    else if (shouldSetAttribute(value)) {
      setAttribute(el, key, value);
    }
  });
}

function setAttribute(el: HTMLElement, key: string, value: any): void {
  if (typeof value === "boolean") {
    if (value) el.setAttribute(key, "");
  } else {
    el.setAttribute(key, value.toString());
  }
}

function processChildren(el: HTMLElement, children: HNodeChildren): void {
  const childArray = Array.isArray(children) ? children : [children];

  childArray.forEach((child) => {
    if (child == null) return;
    if (typeof child === "function") {
      const result = child();
      processChildren(el, Array.isArray(result) ? result : [result]);
    } else if (isPrimitive(child)) {
      el.appendChild(textNode(child));
    } else if (isObject(child)) {
      const childEl = mount(child as HNode, el);
      if (childEl) el.appendChild(childEl);
    }
  });
}

function shouldSetAttribute(value: any): boolean {
  return value != null;
}
