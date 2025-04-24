import type { VNode } from "./types";
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
