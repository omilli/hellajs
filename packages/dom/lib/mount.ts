import type { HellaElement, HellaNode, HellaChild, HellaForEach } from "./types";
import { isFunction, isHellaNode, renderProp, normalizeTextValue, resolveValue, objectLoop, addRegistryEffect, setNodeHandler } from "./internal";

/**
 * mounts a HellaNode to a DOM element.
 * @param node The HellaNode or component function to mount.
 * @param rootSelector="#app" The CSS selector for the root element.
 */
export function mount(node: HellaNode | (() => HellaNode), rootSelector: string = "#app") {
  const mountedNode = mountNode(resolveValue(node) as HellaNode) as HellaElement;
  document.querySelector(rootSelector)?.replaceChildren(mountedNode);
  // Mark as mounted synchronously for immediate reactive updates
  mountedNode.__hella_mounted = mountedNode.nodeType === Node.ELEMENT_NODE;
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
    const textNode = document.createTextNode("") as unknown as HellaElement;
    addRegistryEffect(textNode, () =>
      textNode.textContent = normalizeTextValue(value())
      , parent);
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
  const { tag, props, on, bind, at, children = [], __componentScope } = node;

  if (tag === "$") {
    const fragment = document.createDocumentFragment();
    appendToParent(fragment as unknown as HellaElement, children);
    return fragment;
  }

  const element = document.createElement(tag as string) as HellaElement;

  // Transfer component scope dispose to DOM element
  if (__componentScope) {
    element.__hella_component_scope = __componentScope;
  }

  if (at) {
    element.__hella_at = at;
    element.__hella_at.beforeMount?.();
  }

  objectLoop(props, (key, value) => renderProp(element, key, value));

  objectLoop(on, (eventName, handler) =>
    setNodeHandler(element, eventName, handler as EventListener)
  );

  objectLoop(bind, (key, value) =>
    addRegistryEffect(element, () =>
      renderProp(element, key, resolveValue(value))
    )
  );

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
      if ((child as HellaForEach).isForEach) {
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
      });

      continue;
    }

    const resolved = resolveValue(child);

    if (typeof resolved === "string" || typeof resolved === "number") {
      parent.appendChild(document.createTextNode(normalizeTextValue(resolved)));
    } else if (isHellaNode(resolved)) {
      parent.appendChild(mountNode(resolved));
    }
  }
}