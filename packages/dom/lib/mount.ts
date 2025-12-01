import type { HellaElement, HellaNode, HellaChild, HellaForEach, HellaPortal } from "./types";
import { isFunction, isHellaNode, renderProp, normalizeTextValue, resolveValue, objectLoop, setNodeHandler } from "./internal";

import { registry } from "./registry";

/**
 * Mounts a HellaNode to a DOM element, replacing all existing content.
 * @param node The HellaNode or component function to mount
 * @param target CSS selector string or Element to mount into (defaults to "#app")
 */
export function mount(node: HellaNode | HellaForEach | (() => HellaNode), target: string | Element = "#app") {
  const mountedNode = mountNode(resolveValue(node) as HellaNode) as HellaElement;
  const container = typeof target === "string" ? document.querySelector(target) : target;
  container?.replaceChildren(mountedNode);
  // Mark as mounted synchronously for immediate reactive updates
  mountedNode.__hella_mounted = mountedNode.nodeType === Node.ELEMENT_NODE;
}

/**
 * Resolves a HellaChild to a DOM Node with reactive support.
 * @param value The value to resolve (HellaNode, function, or primitive)
 * @param parent Optional parent element for effect registration
 * @returns The resolved DOM Node
 */
export function resolveNode(value: HellaChild, parent?: HellaElement): Node {
  if (isHellaNode(value)) return mountNode(value);
  if (isFunction(value)) {
    const textNode = document.createTextNode("") as unknown as HellaElement;
    registry.addEffect(parent || textNode, () =>
      textNode.textContent = normalizeTextValue(value())
    );
    return textNode;
  }
  return document.createTextNode(normalizeTextValue(value));
}

/**
 * Mounts a HellaNode to a DOM element or fragment with all properties and lifecycle hooks.
 * @param node The HellaNode to mount
 * @returns The mounted DOM element or fragment
 */
function mountNode(node: HellaNode): HellaElement | DocumentFragment {
  const { tag, props, on, bind, hooks, children = [], __scope } = node;

  if (tag === "$") {
    const fragment = document.createDocumentFragment();
    appendToParent(fragment as unknown as HellaElement, children);
    return fragment;
  }

  const element = document.createElement(tag as string) as HellaElement;

  // Transfer component scope dispose to DOM element
  if (__scope) {
    element.__hella_component_scope = __scope;
  }

  if (hooks) {
    hooks.beforeMount && registry.addHook(element, "beforeMount", hooks.beforeMount);
    hooks.afterMount && registry.addHook(element, "afterMount", hooks.afterMount as (node: Element) => void);
    hooks.beforeDestroy && registry.addHook(element, "beforeDestroy", hooks.beforeDestroy as (node: Element) => void);
    hooks.afterDestroy && registry.addHook(element, "afterDestroy", hooks.afterDestroy);
    hooks.beforeUpdate && registry.addHook(element, "beforeUpdate", hooks.beforeUpdate as (node: Element) => void);
    hooks.afterUpdate && registry.addHook(element, "afterUpdate", hooks.afterUpdate as (node: Element) => void);

    // Run beforeMount immediately since we're about to mount
    hooks.beforeMount?.();
  }

  objectLoop(props, (key, value) => renderProp(element, key, value));

  objectLoop(on, (eventName, handler) =>
    setNodeHandler(element, eventName, handler as EventListener)
  );

  objectLoop(bind, (key, value) =>
    registry.addEffect(element, () =>
      renderProp(element, key, resolveValue(value))
    )
  );

  appendToParent(element, children);

  return element;
}

/**
 * Appends children to a parent element with reactive support.
 * Handles static text, HellaNodes, functions, and forEach.
 * @param parent The parent element
 * @param children The children to append
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
      if ((child as HellaForEach).isForEach || (child as HellaPortal).isPortal) {
        child(parent);
        continue;
      }

      const start = document.createComment("start"),
        end = document.createComment("end");

      parent.appendChild(start);
      parent.appendChild(end);

      registry.addEffect(parent, () => {
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
          let child: ChildNode | null;
          while ((child = newNode.firstChild)) actualParent.insertBefore(child, end);
        } else {
          actualParent.insertBefore(newNode, end);
        }
      });

      continue;
    }

    const resolved = resolveValue(child);

    if (typeof resolved === "string" || typeof resolved === "number") {
      parent.appendChild(document.createTextNode(normalizeTextValue(resolved)));
    } else if (resolved instanceof Node) {
      parent.appendChild(resolved);
    } else if (isHellaNode(resolved)) {
      parent.appendChild(mountNode(resolved));
    }
  }
}