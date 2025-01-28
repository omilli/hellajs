import {
  Component,
  HNode,
  MountTarget,
  RenderableNode,
  RenderResult,
} from "../types";
import { isFunction, isString } from "../global";
import { processChild } from "./nodes";
import { applyProps } from "./props";
import { resolveMount } from "./mount";

export function render(
  hnode: RenderableNode,
  container?: MountTarget
): RenderResult {
  if (isFunction(hnode)) {
    return handleFunctionNode(hnode, container);
  }

  if (isFunction(hnode.type)) {
    return render(hnode.type(hnode.props));
  }

  if (isString(hnode.type)) {
    return setupElement(hnode, container);
  }

  throw new Error("Invalid node type provided to render");
}

function setupElement(hnode: HNode, container?: MountTarget): HTMLElement {
  const el = createElement(hnode);
  handleOnRender(el, hnode);

  if (shouldMount(container, hnode.props.mount)) {
    mountElement(el, container || hnode.props.mount);
  }

  return el;
}

function createElement(hnode: HNode): HTMLElement {
  const el = document.createElement(hnode.type as string);
  applyProps(el, hnode.props);
  processChildren(el, hnode.children);
  return el;
}

function mountElement(el: HTMLElement, container?: MountTarget): HTMLElement {
  const mountTarget = resolveMount(container);
  mountTarget.innerHTML = "";
  mountTarget.appendChild(el);
  return el;
}

function processChildren(el: HTMLElement, children: HNode["children"]): void {
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach((child) => processChild(child, el));
}

function handleOnRender(el: HTMLElement, hnode: HNode): void {
  if (hnode.props?.onRender) {
    hnode.props.onRender(el);
  }
}

function handleFunctionNode(
  node: Component,
  container?: MountTarget
): RenderResult {
  const result = node();
  if (result instanceof HTMLElement) {
    return mountElement(result, container);
  }
  return render(result, container);
}

function shouldMount(
  container?: MountTarget,
  propMount?: MountTarget
): boolean {
  return Boolean(container || propMount);
}
