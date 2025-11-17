import type { HellaElement, HellaNode, HellaChild } from "./types";
import { setNodeHandler } from "./events";
import { addRegistryEffect } from "./registry";
import { DOC, isFunction, isText, isHellaNode, appendChild, createTextNode, EMPTY, FRAGMENT, createDocumentFragment, createElement, createComment, START, END, renderProp, normalizeTextValue, resolveValue } from "./utils";

/**
 * mounts a HellaNode to a DOM element.
 * @param node The HellaNode or component function to mount.
 * @param rootSelector="#app" The CSS selector for the root element.
 */
export function mount(node: HellaNode | (() => HellaNode), rootSelector: string = "#app") {
  DOC.querySelector(rootSelector)?.replaceChildren(
    mountNode(resolveValue(node) as HellaNode)
  );
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
    const textNode = createTextNode(EMPTY);
    let isInitialRender = true;
    addRegistryEffect(textNode, () => {
      !isInitialRender && parent?.onBeforeUpdate?.();
      textNode.textContent = normalizeTextValue(value());
      !isInitialRender && parent?.onUpdate?.();
      isInitialRender = false;
    });
    return textNode;
  }
  return createTextNode(normalizeTextValue(value));
}

/**
 * mounts a HellaNode to a DOM element or fragment.
 * @param node The HellaNode to mount.
 * @returns The mounted DOM element or fragment.
 */
function mountNode(node: HellaNode): HellaElement | DocumentFragment {
  const { tag, props, on, bind, children = [] } = node;

  if (tag === FRAGMENT) {
    const fragment = createDocumentFragment();
    appendToParent(fragment as unknown as HellaElement, children);
    return fragment;
  }

  const element = createElement(tag as string) as HellaElement;

  if (props) {
    const { onBeforeMount, onMount, onBeforeUpdate, onUpdate, onBeforeDestroy, onDestroy, effects } = props;

    element.onBeforeMount = onBeforeMount;
    element.onMount = onMount;
    element.onBeforeUpdate = onBeforeUpdate;
    element.onUpdate = onUpdate;
    element.onBeforeDestroy = onBeforeDestroy;
    element.onDestroy = onDestroy;

    element.onBeforeMount?.();

    // Register effects array
    if (effects && Array.isArray(effects)) {
      let effectIndex = 0, effectsLength = effects.length;
      for (; effectIndex < effectsLength; effectIndex++)
        addRegistryEffect(element, effects[effectIndex]);
      delete props.effects;
    }

    let propsArray = Object.entries(props),
      index = 0, length = propsArray.length;

    for (; index < length; index++) {
      const [key, value] = propsArray[index];
      renderProp(element, key, value);
    }
  }

  // Process event handlers (no string checking needed)
  if (on) {
    let onArray = Object.entries(on),
      index = 0, length = onArray.length;

    for (; index < length; index++) {
      const [eventName, handler] = onArray[index];
      setNodeHandler(element, eventName, handler as EventListener);
    }
  }

  // Process reactive bindings (all values should be functions in bind object)
  if (bind) {
    let bindArray = Object.entries(bind),
      index = 0, length = bindArray.length;

    for (; index < length; index++) {
      const [key, value] = bindArray[index];
      let isInitialRender = true;
      addRegistryEffect(element, () => {
        !isInitialRender && element.onBeforeUpdate?.();
        renderProp(element, key, isFunction(value) ? value() : value);
        !isInitialRender && element.onUpdate?.();
        isInitialRender = false;
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

  let index = 0, length = children.length;
  for (; index < length; index++) {
    const child = children[index];

    if (isFunction(child)) {
      if ((child as any).isForEach) {
        child(parent);
        continue;
      }

      const start = createComment(START),
        end = createComment(END);

      appendChild(parent, start);
      appendChild(parent, end);

      let isInitialRender = true;

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

        !isInitialRender && parent?.onUpdate?.();

        isInitialRender = false;
      });

      continue;
    }

    const resolved = resolveValue(child);

    if (isText(resolved)) {
      appendChild(parent, createTextNode(normalizeTextValue(resolved)));
    } else if (isHellaNode(resolved)) {
      appendChild(parent, mountNode(resolved));
    }
  }
}