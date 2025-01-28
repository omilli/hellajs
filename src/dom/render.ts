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
import { cleanupElementHandlers } from "./events";

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

  // Clean up existing content recursively
  Array.from(mountTarget.children).forEach((child) => {
    if (child instanceof HTMLElement) {
      cleanupElementHandlers(child);
    }
  });

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

const disconnectObserver = initializeCleanupObserver();

function initializeCleanupObserver(): () => void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.removedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          cleanupElementHandlers(node);
        }
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => observer.disconnect();
}

// Add cleanup on window unload
window.addEventListener("unload", () => {
  disconnectObserver();
  document.querySelectorAll("*").forEach((el) => {
    if (el instanceof HTMLElement) {
      cleanupElementHandlers(el);
    }
  });
});
