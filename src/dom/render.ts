import { Component, HNode, RenderableNode, RenderResult } from "../types";
import { componentRegistry, isFunction, isString } from "../global";
import { processChild } from "./nodes";
import { applyProps, cleanupEffects } from "./props";
import { delegateEvents, removeDelegatedListeners } from "./events";

export function render(hnode: RenderableNode, root?: string): RenderResult {
  return isFunction(hnode)
    ? handleFunctionNode(hnode, root)
    : setupElement(hnode, root);
}

function handleFunctionNode(node: Component, root?: string): RenderResult {
  const result = node();
  return result instanceof HTMLElement
    ? mountElement(result, root)
    : render(result, root);
}

function setupElement(hnode: HNode, root?: string): HTMLElement {
  const element = createElement(hnode);
  hnode.props?.onRender && hnode.props.onRender(element);
  isString(root) ||
    (isString(hnode.props.mount) &&
      mountElement(element, root || hnode.props.mount));
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
  if (!root)
    throw new Error("Container must have an id or be a query selector string.");
  componentRegistry(root);
  cleanupEffects(root);
  removeDelegatedListeners(mountTarget, root);
  mountTarget.innerHTML = "";
  mountTarget.appendChild(element);
  delegateEvents(mountTarget, root);
  console.log(1);
  return element;
}

function resolveMount(root: string): HTMLElement {
  if (!root) throw new Error("Mount target required");
  const target = document.querySelector(`[data-h-mount="${root}"]`);
  if (!(target instanceof HTMLElement)) {
    throw new Error(`Mount target not found: ${root}`);
  }
  return target;
}

function processChildren(element: HTMLElement, hnode: HNode): void {
  const { props, children } = hnode;
  let root = props.root || props?.mount;
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach((child) => {
    if (!child) return;
    let childNode = child as HNode;
    childNode.props && (childNode.props.root = root);
    processChild(childNode, element, root);
  });
}
