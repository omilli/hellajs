import {
  Component,
  HNode,
  MountTarget,
  RenderableNode,
  RenderResult,
} from "../types";
import { COMPONENT_REGISTRY, isFunction, isString } from "../global";
import { processChild } from "./nodes";
import { applyProps, cleanupEffects } from "./props";
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
  applyProps(el, hnode);
  processChildren(el, hnode);
  return el;
}

function mountElement(el: HTMLElement, container?: MountTarget): HTMLElement {
  const mountTarget = resolveMount(container);
  const root =
    typeof container === "string"
      ? container
      : container instanceof HTMLElement && container.id
      ? `#${container.id}`
      : undefined;

  if (!root) {
    throw new Error(
      "Unable to generate component root. Container must have an id or be a query selector string."
    );
  }

  // Cleanup existing element effects if any
  const existing = COMPONENT_REGISTRY.get(root);
  if (existing) {
    cleanupEffects(root);
  }

  mountTarget.innerHTML = "";
  mountTarget.appendChild(el);

  COMPONENT_REGISTRY.set(root, {
    element: el,
    nodeEffects: existing?.nodeEffects || new Set(),
    propEffects: existing?.propEffects || new Set(),
  });

  return el;
}

function processChildren(el: HTMLElement, hnode: HNode): void {
  const hellaNode = hnode as HNode;
  const { props, children } = hellaNode;
  let root = props.root || props?.mount || props?.id;
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach((child) => {
    let childNode = child as HNode;
    if (childNode.props) {
      childNode.props.root = root;
    }
    processChild(childNode, el, root);
  });
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
