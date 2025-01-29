import {
  COMPONENT_REGISTRY_DEFAULTS,
  isFunction,
  isObject,
  isPrimitive,
  isString,
} from "../global";
import { COMPONENT_REGISTRY } from "../global";
import { Component, HNode, HNodeChildren, HProps, MountTarget } from "../types";
import { textNode } from "./nodes";
import { applyProps } from "./props";

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
  const root = getComponentKey(
    container,
    isFunction(hnode) ? undefined : hnode.props
  );

  COMPONENT_REGISTRY.set(root, COMPONENT_REGISTRY_DEFAULTS);

  let result: HTMLElement;
  if (isFunction(hnode)) {
    result = mountComponent(hnode, mountTarget);
  } else if (isFunction(hnode.type)) {
    result = mount(hnode.type(hnode.props), mountTarget);
  } else if (isString(hnode.type)) {
    result = createElement(hnode, root);
    mountTarget.appendChild(result);
  } else {
    throw new Error("Invalid node type");
  }
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

function createElement(hnode: HNode, root: string): HTMLElement {
  const el = document.createElement(hnode.type as string);
  if (!hnode.props) hnode.props = {};
  hnode.props.root = root;
  applyProps(el, hnode);
  processChildren(el, hnode.children, root);
  return el;
}

function processChildren(
  el: HTMLElement,
  children: HNodeChildren,
  root: string
): void {
  const childArray = Array.isArray(children) ? children : [children];

  childArray.forEach((child) => {
    if (child == null) return;
    if (typeof child === "function") {
      const result = child();
      processChildren(el, Array.isArray(result) ? result : [result], root);
    } else if (isPrimitive(child)) {
      el.appendChild(textNode(child));
    } else if (isObject(child)) {
      if ((child as HNode).props) {
        (child as HNode).props.root = root;
      }
      const childEl = mount(child as HNode, el);
      if (childEl) el.appendChild(childEl);
    }
  });
}
