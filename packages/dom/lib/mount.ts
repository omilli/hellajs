import type { HellaElement, HellaNode, HellaChild } from "./types";
import { addRegistryEffect } from "./registry";
import { reactiveElement } from "./element";
import { isFunction, isHellaNode, renderProp, normalizeTextValue, resolveValue } from "./utils";

/**
 * mounts a HellaNode to a DOM element.
 * @param node The HellaNode or component function to mount.
 * @param rootSelector="#app" The CSS selector for the root element.
 */
export function mount(node: HellaNode | (() => HellaNode), rootSelector: string = "#app") {
  const mountedNode = mountNode(resolveValue(node) as HellaNode);
  document.querySelector(rootSelector)?.replaceChildren(mountedNode);

  // Mark as mounted synchronously for immediate reactive updates
  if (mountedNode.nodeType === Node.ELEMENT_NODE) {
    (mountedNode as HellaElement).__hella_mounted = true;
  }
}

/**
 * Resolves a HellaChild to a DOM Node.
 * @param value The value to resolve.
 * @param parent The parent element.
 * @returns The resolved DOM Node.
 */
export function resolveNode(value: HellaChild, parent?: HellaElement): Node {
  if (isHellaNode(value)) return mountNode(value);
  if (isFunction(value)) {
    const textNode = document.createTextNode("");
    addRegistryEffect(textNode, () => {
      const isMounted = parent?.__hella_mounted;
      isMounted && parent?.__hella_lifecycle?.onBeforeUpdate?.();
      textNode.textContent = normalizeTextValue(value());
      isMounted && parent?.__hella_lifecycle?.onUpdate?.();
    });
    return textNode;
  }
  return document.createTextNode(normalizeTextValue(value));
}

/**
 * mounts a HellaNode to a DOM element or fragment.
 * @param node The HellaNode to mount.
 * @returns The mounted DOM element or fragment.
 */
function mountNode(node: HellaNode): HellaElement | DocumentFragment {
  const { tag, props, on, bind, lifecycle, children = [] } = node;

  if (tag === "$") {
    const fragment = document.createDocumentFragment();
    appendToParent(fragment as unknown as HellaElement, children);
    return fragment;
  }

  const element = document.createElement(tag as string) as HellaElement;
  const wrapper = reactiveElement(element);

  if (lifecycle) {
    wrapper.lifecycle(lifecycle);
    lifecycle.onBeforeMount?.();
  }

  if (props) {
    wrapper.attr(props);
  }

  if (on) {
    let onArray = Object.entries(on),
      index = 0, length = onArray.length;

    for (; index < length; index++) {
      const [eventName, handler] = onArray[index];
      wrapper.on(eventName as keyof import("./types").DOMEventMap, handler as any);
    }
  }

  // Process reactive bindings (all values should be functions in bind object)
  if (bind) {
    let bindArray = Object.entries(bind),
      index = 0, length = bindArray.length;

    for (; index < length; index++) {
      const [key, value] = bindArray[index];
      addRegistryEffect(element, () => {
        const isMounted = element.__hella_mounted;
        isMounted && element.__hella_lifecycle?.onBeforeUpdate?.();
        renderProp(element, key, isFunction(value) ? value() : value);
        isMounted && element.__hella_lifecycle?.onUpdate?.();
      });
    }
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

  // Fast path: single static text child
  if (children.length === 1 && typeof children[0] === 'string') {
    parent.textContent = children[0];
    return;
  }

  let index = 0, length = children.length;
  for (; index < length; index++) {
    const child = children[index];

    if (isFunction(child)) {
      if ((child as any).isForEach) {
        child(parent);
        continue;
      }

      const start = document.createComment("start"),
        end = document.createComment("end");

      parent.appendChild(start);
      parent.appendChild(end);

      addRegistryEffect(parent, () => {
        // Use marker's parentNode to handle fragments correctly
        const actualParent = start.parentNode;
        if (!actualParent) return;

        let newNode = resolveNode(resolveValue(child), parent),
          currentNode = start.nextSibling;

        while (currentNode && currentNode !== end) {
          const nextNode = currentNode.nextSibling;
          actualParent.removeChild(currentNode);
          currentNode = nextNode;
        }

        if (newNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          const childNodes = Array.from(newNode.childNodes);
          let i = 0, len = childNodes.length;
          for (; i < len; i++)
            actualParent.insertBefore(childNodes[i], end);
        } else {
          actualParent.insertBefore(newNode, end);
        }

        const isMounted = parent?.__hella_mounted;
        isMounted && parent?.__hella_lifecycle?.onUpdate?.();
      });

      continue;
    }

    const resolved = resolveValue(child);
    const resolvedType = typeof resolved;

    if (resolvedType === "string" || resolvedType === "number") {
      parent.appendChild(document.createTextNode(normalizeTextValue(resolved)));
    } else if (isHellaNode(resolved)) {
      parent.appendChild(mountNode(resolved));
    }
  }
}