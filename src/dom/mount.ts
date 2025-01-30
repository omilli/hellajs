import {
  componentRegistry,
  isFunction,
  isObject,
  isPrimitive,
  isString,
} from "../global";
import { Component, HNode, HNodeChildren } from "../types";
import { textNode } from "./nodes";
import { applyProps } from "./props";

export function mount(hnode: HNode | Component, root: string): HTMLElement {
  const mountTarget = resolveMount(root);
  let result: HTMLElement;
  componentRegistry(root);
  if (isFunction(hnode)) {
    result = mountComponent(hnode, mountTarget);
  } else if (isFunction(hnode.type)) {
    result = mount(hnode.type(hnode.props), root);
  } else if (isString(hnode.type)) {
    result = createElement(hnode, root);
    mountTarget.appendChild(result);
  } else {
    throw new Error("Invalid node type");
  }
  return result;
}

export function resolveMount(root: string): HTMLElement {
  if (!root) throw new Error("Mount target required");
  const target = document.querySelector(root);
  if (!(target instanceof HTMLElement)) {
    throw new Error(`Mount target not found: ${root}`);
  }
  return target;
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
  return mount(result, target.getAttribute("root")!);
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
  element: HTMLElement,
  children: HNodeChildren,
  root: string
): void {
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach((child) => {
    if (child == null) return;
    if (typeof child === "function") {
      const result = child();
      processChildren(element, Array.isArray(result) ? result : [result], root);
    } else if (isPrimitive(child)) {
      element.appendChild(textNode(child));
    } else if (isObject(child)) {
      (child as HNode).props && ((child as HNode).props.root = root);
      const childEl = mount(child as HNode, element.getAttribute("root")!);
      if (childEl) element.appendChild(childEl);
    }
  });
}
