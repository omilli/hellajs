import { createElement } from "../dom";
import { effect } from "../reactive";
import type { VNode } from "../types";
import { renderFor } from "./for";

export function renderFunction(
  vNode: () => unknown,
  parent: Node,
  rootSelector: string
): Node | null {
  let domNode: Node | null = null;

  effect(() => {
    const value = vNode();

    if (Array.isArray(value)) {
      renderFor(value as VNode[], vNode, parent, domNode, rootSelector);
    } else if (value && typeof value === 'object' && 'tag' in value) {
      if (domNode && domNode.parentNode) {
        const newNode = createElement(value as VNode, parent, rootSelector);
        if (newNode) {
          parent.replaceChild(newNode, domNode);
          domNode = newNode;
        }
      } else {
        domNode = createElement(value as VNode, parent, rootSelector);
      }
    } else {
      const textContent = String(value);
      if (!domNode) {
        domNode = document.createTextNode(textContent);
        parent.appendChild(domNode);
      } else {
        domNode.textContent = textContent;
      }
    }
  });

  return domNode;
}