import { Component, HNode, RenderableNode, RenderResult } from "../types";
import {
  COMPONENT_REGISTRY,
  COMPONENT_REGISTRY_DEFAULTS,
  isFunction,
} from "../global";
import { processChild } from "./nodes";
import { applyProps, cleanupEffects } from "./props";
import { resolveMount } from "./mount";
import { delegateEvents } from "./events";

export function render(hnode: RenderableNode, root?: string): RenderResult {
  return isFunction(hnode)
    ? handleFunctionNode(hnode, root)
    : setupElement(hnode, root);
}

function setupElement(hnode: HNode, root?: string): HTMLElement {
  const element = createElement(hnode);
  handleOnRender(element, hnode);

  if (shouldMount(root, hnode.props.mount)) {
    mountElement(element, root || hnode.props.mount);
  }

  return element;
}

function createElement(hnode: HNode): HTMLElement {
  const element = document.createElement(hnode.type as string);
  applyProps(element, hnode);
  processChildren(element, hnode);
  return element;
}

function mountElement(element: HTMLElement, root?: string): HTMLElement {
  const mountTarget = resolveMount(root!);

  if (!root) {
    throw new Error(
      "Unable to generate component root. Container must have an id or be a query selector string."
    );
  }

  COMPONENT_REGISTRY.set(root, COMPONENT_REGISTRY_DEFAULTS);

  cleanupEffects(root);

  mountTarget.innerHTML = "";
  mountTarget.appendChild(element);

  delegateEvents(mountTarget, root);

  return element;
}

function processChildren(element: HTMLElement, hnode: HNode): void {
  const { props, children } = hnode;
  let root = props.root || props?.mount;
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach((child) => {
    if (!child) return;
    let childNode = child as HNode;
    if (childNode.props) {
      childNode.props.root = root;
    }
    processChild(childNode, element, root);
  });
}

function handleOnRender(element: HTMLElement, hnode: HNode): void {
  if (hnode.props?.onRender) {
    hnode.props.onRender(element);
  }
}

function handleFunctionNode(node: Component, root?: string): RenderResult {
  const result = node();
  if (result instanceof HTMLElement) {
    return mountElement(result, root);
  }
  return render(result, root);
}

function shouldMount(root?: string, propMount?: string): boolean {
  return Boolean(root || propMount);
}
