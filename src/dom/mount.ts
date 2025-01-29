import { isFunction, isObject, isPrimitive, isString } from "../global";
import { COMPONENT_REGISTRY } from "../global";
import { Component, HNode, HNodeChildren, HProps, MountTarget } from "../types";
import { textNode } from "./nodes";

function getComponentKey(container: MountTarget, props?: HProps): string {
  if (typeof container === "string") return container;
  if (container instanceof HTMLElement && container.id)
    return `#${container.id}`;
  if (props?.mount) {
    if (typeof props.mount === "string") return props.mount;
    if (props.mount instanceof HTMLElement && props.mount.id)
      return `#${props.mount.id}`;
  }
  throw new Error(
    "Unable to generate component key. Container must have an id or be a query selector string."
  );
}

export function mount(
  hnode: HNode | Component,
  container: MountTarget
): HTMLElement {
  const mountTarget = resolveMount(container);
  const key = getComponentKey(
    container,
    isFunction(hnode) ? undefined : hnode.props
  );

  let result: HTMLElement;
  if (isFunction(hnode)) {
    result = mountComponent(hnode, mountTarget);
  } else if (isFunction(hnode.type)) {
    result = mount(hnode.type(hnode.props), mountTarget);
  } else if (isString(hnode.type)) {
    const el = createElement(hnode);
    mountTarget.appendChild(el);
    result = el;
  } else {
    throw new Error("Invalid node type");
  }

  COMPONENT_REGISTRY.set(key, result);
  return result;
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
