import { Component, HNode, RenderableNode, RenderResult } from "../types";
import {
  COMPONENT_REGISTRY,
  COMPONENT_REGISTRY_DEFAULTS,
  isFunction,
  isString,
} from "../global";
import { processChild } from "./nodes";
import { applyProps, cleanupEffects } from "./props";
import { resolveMount } from "./mount";

export function render(hnode: RenderableNode, root?: string): RenderResult {
  if (isFunction(hnode)) {
    return handleFunctionNode(hnode, root);
  }

  if (isFunction(hnode.type)) {
    return render(hnode.type(hnode.props));
  }

  if (isString(hnode.type)) {
    return setupElement(hnode, root);
  }

  throw new Error("Invalid node type provided to render");
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

  // Initialize component before mounting
  console.log(root);

  COMPONENT_REGISTRY.set(root, COMPONENT_REGISTRY_DEFAULTS);

  // Cleanup existing element effects if any
  const existing = COMPONENT_REGISTRY.get(root);
  if (existing) {
    cleanupEffects(root);
  }

  mountTarget.innerHTML = "";
  mountTarget.appendChild(element);

  return element;
}

function processChildren(element: HTMLElement, hnode: HNode): void {
  const hellaNode = hnode as HNode;
  const { props, children } = hellaNode;
  let root = props.root || props?.mount || props?.id;
  console.log(element, root);
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach((child) => {
    let childNode = child as HNode;
    if (!childNode) return;
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
