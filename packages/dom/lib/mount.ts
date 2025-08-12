import { effect } from "@hellajs/core";
import type { VNode, VNodeValue } from "./types";
import { setNodeHandler } from "./events";
import { addElementEffect } from "./cleanup";
import { DOC, isFragment, isFunction, isNode, isText, isVNode } from "./utils";

export function mount(vNode: VNode | (() => VNode), rootSelector: string = "#app") {
  if (isFunction(vNode)) vNode = vNode();
  DOC.querySelector(rootSelector)?.replaceChildren(renderVNode(vNode));
}

export function resolveNode(value: VNodeValue, parent?: Node): Node {
  if (isText(value)) return DOC.createTextNode(value as string);
  if (isVNode(value)) return renderVNode(value);
  if (isNode(value)) return value;
  if (isFunction(value)) {
    const textNode = DOC.createTextNode("");
    addElementEffect(textNode, effect(() => {
      textNode.textContent = value() as string
      (parent as any)?.onUpdate?.()
    }));
    return textNode;
  }
  return DOC.createComment("empty");
}

function renderVNode(vNode: VNode): HTMLElement | DocumentFragment {
  const { tag, props, children } = vNode;

  if (tag === "$") {
    const fragment = DOC.createDocumentFragment();
    appendToParent(fragment, children);
    return fragment;
  }

  const element = DOC.createElement(tag as string);

  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key === "onUpdate")
        return (element as any).onUpdate = props.onUpdate;
      if (key === "onDestroy")
        return (element as any).onDestroy = props.onDestroy;
      if (key.startsWith("on"))
        return setNodeHandler(element, key.slice(2).toLowerCase(), value as EventListener);
      if (isFunction(value))
        return addElementEffect(element, effect(() => {
          renderProps(element, key, value());
          (element as any).onUpdate?.();
        }));

      renderProps(element, key, value);
    });
  }

  appendToParent(element, children);

  return element;
}

function appendToParent(parent: Node, children?: VNodeValue[]) {
  children?.forEach((child) => {
    if (isFunction(child) && child.length === 1) {
      if (["parent", "forEach"].some(key => child.toString().includes(key)))
        return child(parent);
    }

    if (isFunction(child)) {
      const startMarker = DOC.createComment("dynamic-start");
      const endMarker = DOC.createComment("dynamic-end");
      parent.appendChild(startMarker);
      parent.appendChild(endMarker);

      const childEffectFn = () => {
        if (!endMarker.parentNode || endMarker.parentNode !== parent) return;

        const value = resolveValue(child);
        let newNode = resolveNode(value, parent);

        let current = startMarker.nextSibling;
        while (current && current !== endMarker) {
          const next = current.nextSibling;
          parent.removeChild(current);
          current = next;
        }

        if (isFragment(newNode)) {
          Array.from(newNode.childNodes).forEach(node => {
            if (endMarker.parentNode === parent) {
              parent.insertBefore(node, endMarker);
            }
          });
        } else {
          if (endMarker.parentNode === parent) {
            parent.insertBefore(newNode, endMarker);
          }
        }

        (parent as any)?.onUpdate?.()
      };

      addElementEffect(parent, effect(childEffectFn));
      childEffectFn();
      return;
    }

    const resolved = resolveValue(child);

    if (isText(resolved))
      return parent.appendChild(DOC.createTextNode(resolved as string));

    if (isNode(resolved))
      return parent.appendChild(resolved);

    if (isVNode(resolved))
      parent.appendChild(renderVNode(resolved));
  });
}

function renderProps(element: HTMLElement, key: string, value: unknown) {
  if (key === "class" && Array.isArray(value)) {
    element.setAttribute("class", value.filter(Boolean).join(" "));
    return;
  }

  if (key === "children") return;

  if (key in element)
    // @ts-ignore
    element[key] = value;
  else
    element.setAttribute(key, value as string);
}

function resolveValue(value: unknown): unknown {
  if (isFunction(value))
    value = value();
  return value;
}