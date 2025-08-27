import { effect, type Signal } from "./core";
import type { HellaElement, VNode, VNodeValue } from "./types";
import { setNodeHandler } from "./events";
import { addElementEffect } from "./cleanup";
import { DOC, isFragment, isFunction, isNode, isText, isVNode } from "./utils";

/**
 * Mounts a VNode to a DOM element.
 * @param vNode The VNode or component function to mount.
 * @param rootSelector="#app" The CSS selector for the root element.
 */
export function mount(vNode: VNode | (() => VNode), rootSelector: string = "#app") {
  if (isFunction(vNode)) vNode = vNode();
  DOC.querySelector(rootSelector)?.replaceChildren(renderVNode(vNode));
}

/**
 * Resolves a VNodeValue to a DOM Node.
 * @param value The value to resolve.
 * @param parent The parent element.
 * @returns The resolved DOM Node.
 */
export function resolveNode(value: VNodeValue, parent?: HellaElement): Node {
  if (isText(value)) return DOC.createTextNode(value as string);
  if (isVNode(value)) return renderVNode(value);
  if (isNode(value)) return value;
  if (isFunction(value)) {
    const textNode = DOC.createTextNode("");
    addElementEffect(textNode as unknown as HellaElement, effect(() => {
      textNode.textContent = value() as string
      (parent)?.onUpdate?.()
    }));
    return textNode;
  }
  return DOC.createComment("empty");
}

/**
 * Renders a VNode to a DOM element or fragment.
 * @param vNode The VNode to render.
 * @returns The rendered DOM element or fragment.
 */
function renderVNode(vNode: VNode): HellaElement | DocumentFragment {
  const { tag, props, children } = vNode;

  if (tag === "$") {
    const fragment = DOC.createDocumentFragment();
    appendToParent(fragment as unknown as HellaElement, children);
    return fragment;
  }

  const element = DOC.createElement(tag as string) as HellaElement;

  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key === "onUpdate")
        return element.onUpdate = props.onUpdate;
      if (key === "onDestroy")
        return element.onDestroy = props.onDestroy;
      if (key.startsWith("on"))
        return setNodeHandler(element, key.slice(2).toLowerCase(), value as EventListener);
      if (isFunction(value))
        return addElementEffect(element, effect(() => {
          renderProps(element, key, value());
          element.onUpdate?.();
        }));

      renderProps(element, key, value);
    });
  }

  appendToParent(element, children);

  return element;
}

/**
 * Appends children to a parent element.
 * @param parent The parent element.
 * @param children The children to append.
 */
function appendToParent(parent: HellaElement, children?: VNodeValue[]) {
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
          Array.from(newNode.childNodes).forEach(element => {
            if (endMarker.parentNode === parent) {
              parent.insertBefore(element, endMarker);
            }
          });
        } else {
          if (endMarker.parentNode === parent) {
            parent.insertBefore(newNode, endMarker);
          }
        }

        parent?.onUpdate?.()
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

/**
 * Renders props to a DOM element.
 * @param element The element to render props to.
 * @param key The prop key.
 * @param value The prop value.
 */
function renderProps(element: HellaElement, key: string, value: unknown) {
  if (key === "class" && Array.isArray(value)) {
    element.setAttribute("class", value.filter(Boolean).join(" "));
    return;
  }

  if (key === "children") return;

  if (key in element)
    (element as any)[key] = value;
  else
    element.setAttribute(key, value as string);
}

/**
 * Resolves a value, executing it if it's a function.
 * @param value The value to resolve.
 * @returns The resolved value.
 */
function resolveValue(value: unknown): unknown {
  if (isFunction(value))
    value = value();
  return value;
}