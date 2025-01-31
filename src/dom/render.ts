import { Component, HNode, RenderableNode, RenderResult } from "./types";
import { componentRegistry, isFunction, isRecord, isString } from "../global";
import { processChild } from "./nodes";
import { applyProps, cleanupEffects } from "./props";
import { removeDelegatedListeners } from "./events";

export function render(node: RenderableNode, root?: string): RenderResult {
  return isFunction(node)
    ? handleFunctionNode(node, root)
    : setupElement(node, root);
}

function handleFunctionNode(node: Component, root?: string): RenderResult {
  const result = node();
  const hnode = result as HNode;
  if (isRecord(hnode)) {
    const mount = hnode.props?.mount;
    const mountElement = document.querySelector(`[data-h-mount="${mount}"]`);
    mountElement && removeDelegatedListeners(mountElement!, root!);
  }
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
  mountTarget.innerHTML = "";
  mountTarget.appendChild(element);
  return element;
}

function resolveMount(root: string): HTMLElement {
  const target = document.querySelector(`[data-h-mount="${root}"]`);
  if (!target) throw new Error(`Mount not found: ${root}`);
  return target as HTMLElement;
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
