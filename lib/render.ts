import type { ReactiveElement, VNode } from "./types";
import { createElement, getRootElement } from "./dom";
/**
 * Simple render function that mounts a VNode to a DOM element
 * 
 * @param vnode - The virtual DOM node to render
 * @param rootSelector - CSS selector for the container element
 * @returns The created DOM node
 */
export function render(vnode: VNode, rootSelector: string): Node {
  const rootElement = getRootElement(rootSelector);
  const element = createElement(vnode);
  rootElement.appendChild(element);
  return element;
}


export function cleanup(node: ChildNode): void {
  // Remove event listeners and subscriptions
  if (node instanceof HTMLElement) {
    (node as ReactiveElement)._cleanup?.();

    if ((node as ReactiveElement)._cleanups) {
      for (const cleanupFn of (node as ReactiveElement)._cleanups || []) {
        cleanupFn();
      }
    }
  }

  // Recursively clean up child nodes
  node.childNodes.forEach(cleanup);
}
