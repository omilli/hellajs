import type { Signal, VNode } from "./types";
import { getRootElement } from "./utils";
import { createElement } from "./utils/element";

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

/**
 * Utility function to clean up all reactive subscriptions and events
 * 
 * @param node - The DOM node to clean up
 */
export function cleanup(node: Node): void {
  // Remove event listeners and subscriptions
  if (node instanceof HTMLElement) {
    if ((node as any)._cleanup) {
      (node as any)._cleanup();
    }

    if ((node as any)._cleanups) {
      for (const cleanupFn of (node as any)._cleanups) {
        cleanupFn();
      }
    }
  }

  // Recursively clean up child nodes
  node.childNodes.forEach(cleanup);
}
