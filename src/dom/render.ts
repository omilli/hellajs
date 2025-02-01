import { Component, HellaElement, RenderableNode, RenderResult } from "./types";
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
  const hnode = result as HellaElement;
  const mount = hnode?.mount;
  if (isRecord(hnode) && mount) {
    const rootElement = document.querySelector(`[data-h-mount="${mount}"]`);
    rootElement && removeDelegatedListeners(rootElement!, root!);
  }
  return result instanceof HTMLElement
    ? mountElement(result, root)
    : render(result, root);
}

function setupElement(hnode: HellaElement, root?: string): HTMLElement {
  const element = createElement(hnode);
  hnode?.onRender && hnode.onRender(element);
  isString(root) ||
    (isString(hnode.mount) && mountElement(element, root || hnode.mount));
  return element;
}

function createElement(hnode: HellaElement): HTMLElement {
  const element = document.createElement(hnode.tag as string);
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

function processChildren(element: HTMLElement, hnode: HellaElement): void {
  const { children } = hnode;
  let root = hnode.root || hnode?.mount;
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach((child) => {
    if (!child) return;
    let childNode = child as HellaElement;
    isRecord(childNode) && (childNode.root = root);
    processChild(childNode, element, root!);
  });
}
