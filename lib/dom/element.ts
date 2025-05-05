import { effect, type Scope } from "../reactive";
import { renderFunction, rootRegistry } from "../render";
import type { HTMLTagName, VNode } from "../types";

export function createElement(
  vNode: VNode | string | (() => unknown),
  parent: Node,
  rootSelector: string
): Node | null {
  if (typeof vNode === 'string' || typeof vNode === 'number') {
    const text = vNode;
    const textNode = document.createTextNode(text);
    parent.appendChild(textNode);
    return textNode;
  }

  if (typeof vNode === 'function') {
    return renderFunction(vNode, parent, rootSelector);
  }

  const { tag, props, children } = vNode;


  if (tag === '$') {
    const len = children.length;
    for (let i = 0; i < len; i++) {
      createElement(children[i] as VNode, parent, rootSelector);
    }
    return null;
  }

  const element = document.createElement(tag as keyof HTMLTagName);
  const delegator = rootRegistry.get(rootSelector);
  const keys = Object.keys(props);
  const keyLen = keys.length;

  let context = props._context as Scope;

  for (let i = 0; i < keyLen; i++) {
    const key = keys[i];
    const value = props[key];

    if (key === 'key' || key === '_context') {
      continue;
    }

    if (typeof value === 'function') {
      if (key.startsWith('on')) {
        delegator?.addHandler(element, key.slice(2), value as EventListener);
        if (context) {
          context.effects.add(() => {
            delegator?.removeHandlersForElement(element);
          });
        }
      } else {
        effect(() => element.setAttribute(key, value() as string));
      }
    } else {
      element.setAttribute(key, value as string);
    }
  }

  const len = children.length;
  if (len > 1) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < len; i++) {
      createElement(children[i] as VNode, fragment, rootSelector);
    }
    element.appendChild(fragment);
  } else if (len === 1) {
    createElement(children[0] as VNode, element, rootSelector);
  }

  parent.appendChild(element);
  return element;
}