import { effect } from "./core";
import type { HellaElement, HellaNode, HellaChild } from "./types";
import { setNodeHandler } from "./events";
import { addRegistryEffect } from "./cleanup";
import { DOC, isFunction, isNode, isText, isHellaNode, appendChild } from "./utils";

/**
 * Mounts a HellaNode to a DOM element.
 * @param HellaNode The HellaNode or component function to mount.
 * @param rootSelector="#app" The CSS selector for the root element.
 */
export function mount(HellaNode: HellaNode | (() => HellaNode), rootSelector: string = "#app") {
  if (isFunction(HellaNode)) HellaNode = HellaNode();
  DOC.querySelector(rootSelector)?.replaceChildren(renderNode(HellaNode));
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
 * @param HellaNode The HellaNode to render.
 * @returns The rendered DOM element or fragment.
 */
function renderNode(HellaNode: HellaNode): HellaElement | DocumentFragment {
  const { tag, props, children = [] } = HellaNode;

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
  if (!children || children.length === 0) return;
  
  children.forEach((child) => {
    if (isFunction(child)) {
      if ((child as any).isForEach) return child(parent);

      const start = DOC.createComment("start"),
        end = DOC.createComment("end");

      appendChild(parent, start);
      appendChild(parent, end);

      addRegistryEffect(parent, () => {
        if (!end.parentNode || end.parentNode !== parent) return;

        let newNode = resolveNode(resolveValue(child), parent),
          currentNode = start.nextSibling;

        while (currentNode && currentNode !== end) {
          const nextNode = currentNode.nextSibling;
          parent.removeChild(currentNode);
          currentNode = nextNode;
        }

        const insert = (element: Node) =>
          end.parentNode === parent && parent.insertBefore(element, end);

        newNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE ?
          Array.from(newNode.childNodes).forEach(element => insert(element))
          : insert(newNode);

        parent?.onUpdate?.()
      });

      return;
    }

    const resolved = resolveValue(child);
    isText(resolved) && appendChild(parent, DOC.createTextNode(resolved as string));
    isHellaNode(resolved) && appendChild(parent, renderNode(resolved));
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