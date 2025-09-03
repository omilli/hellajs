import { effect } from "./core";
import type { HellaElement, HellaNode, HellaChild } from "./types";
import { setNodeHandler } from "./events";
import { addRegistryEffect } from "./cleanup";
import { DOC, isFragment, isFunction, isNode, isText, isHellaNode } from "./utils";

/**
 * Mounts a HellaNode to a DOM element.
 * @param vNode The HellaNode or component function to mount.
 * @param rootSelector="#app" The CSS selector for the root element.
 */
export function mount(vNode: HellaNode | (() => HellaNode), rootSelector: string = "#app") {
  if (isFunction(vNode)) vNode = vNode();
  DOC.querySelector(rootSelector)?.replaceChildren(renderNode(vNode));
}

/**
 * Resolves a HellaChild to a DOM Node.
 * @param value The value to resolve.
 * @param parent The parent element.
 * @returns The resolved DOM Node.
 */
export function resolveNode(value: HellaChild, parent?: HellaElement): Node {
  if (isText(value)) return DOC.createTextNode(value as string);
  if (isHellaNode(value)) return renderNode(value);
  if (isNode(value)) return value;
  if (isFunction(value)) {
    const textNode = DOC.createTextNode("");
    addRegistryEffect(textNode, () => {
      textNode.textContent = value() as string
      (parent)?.onUpdate?.()
    });
    return textNode;
  }
  return DOC.createComment("empty");
}

/**
 * Renders a HellaNode to a DOM element or fragment.
 * @param vNode The HellaNode to render.
 * @returns The rendered DOM element or fragment.
 */
function renderNode(vNode: HellaNode): HellaElement | DocumentFragment {
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
        return addRegistryEffect(element, () => {
          renderProps(element, key, value());
          element.onUpdate?.();
        });

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
function appendToParent(parent: HellaElement, children?: HellaChild[]) {
  children?.forEach((child) => {
    if (isFunction(child)) {
      if ((child as any).isForEach) return child(parent);

      const start = DOC.createComment("dynamic-start");
      const end = DOC.createComment("dynamic-end");
      parent.appendChild(start);
      parent.appendChild(end);

      addRegistryEffect(parent, () => {
        if (!end.parentNode || end.parentNode !== parent) return;

        let newNode = resolveNode(resolveValue(child), parent);
        let currentNode = start.nextSibling;

        while (currentNode && currentNode !== end) {
          const nextNode = currentNode.nextSibling;
          parent.removeChild(currentNode);
          currentNode = nextNode;
        }

        isFragment(newNode) ? Array.from(newNode.childNodes).forEach(element =>
          end.parentNode === parent && parent.insertBefore(element, end)
        ) :
          end.parentNode === parent && parent.insertBefore(newNode, end);

        parent?.onUpdate?.()
      });

      return;
    }

    const resolved = resolveValue(child);
    isText(resolved) && parent.appendChild(DOC.createTextNode(resolved as string));
    isNode(resolved) && parent.appendChild(resolved);
    isHellaNode(resolved) && parent.appendChild(renderNode(resolved));
  });
}

/**
 * Renders props to a DOM element.
 * @param element The element to render props to.
 * @param key The prop key.
 * @param value The prop value.
 */
function renderProps(element: HellaElement, key: string, value: unknown) {
  value = Array.isArray(value) ? value.filter(Boolean).join(" ") : value;
  if (key === "children") return;
  else element.setAttribute(key, value as string);
}

/**
 * Resolves a value, executing it if it's a function.
 * @param value The value to resolve.
 * @returns The resolved value.
 */
function resolveValue(value: unknown): unknown {
  value = isFunction(value) ? value() : value;
  return value;
}