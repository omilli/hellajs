import type { HellaElement, HellaNode, HellaChild } from "./types";
import { setNodeHandler } from "./events";
import { addRegistryEffect } from "./registry";
import { DOC, isFunction, isText, isHellaNode, appendChild, createTextNode, EMPTY, FRAGMENT, createDocumentFragment, createElement, ON, createComment, START, END, insertBefore, renderProp, normalizeTextValue } from "./utils";

/**
 * Mounts a HellaNode to a DOM element.
 * @param HellaNode The HellaNode or component function to mount.
 * @param rootSelector="#app" The CSS selector for the root element.
 */
export function mount(HellaNode: HellaNode | (() => HellaNode), rootSelector: string = "#app") {
  DOC.querySelector(rootSelector)?.replaceChildren(
    renderNode(
      isFunction(HellaNode) ? HellaNode() as HellaNode : HellaNode
    )
  );
}

/**
 * Resolves a HellaChild to a DOM Node.
 * @param value The value to resolve.
 * @param parent The parent element.
 * @returns The resolved DOM Node.
 */
export function resolveNode(value: HellaChild, parent?: HellaElement): Node {
  if (isHellaNode(value)) return renderNode(value);
  if (isFunction(value)) {
    const textNode = createTextNode(EMPTY);
    addRegistryEffect(textNode, () => {
      textNode.textContent = normalizeTextValue(value());
      (parent)?.onUpdate?.()
    });
    return textNode;
  }
  return createTextNode(normalizeTextValue(value));
}




/**
 * Resolves a value by executing it if it's a function, otherwise returns it as-is.
 * Used to handle both static values and reactive function expressions.
 * @param value The value to resolve (could be static or a function).
 * @returns The resolved value.
 */
const resolveValue = (value: unknown): unknown => isFunction(value) ? value() : value;

/**
 * Renders a HellaNode to a DOM element or fragment.
 * @param HellaNode The HellaNode to render.
 * @returns The rendered DOM element or fragment.
 */
function renderNode(HellaNode: HellaNode): HellaElement | DocumentFragment {
  const { tag, props, children = [] } = HellaNode;

  if (tag === FRAGMENT) {
    const fragment = createDocumentFragment();
    appendToParent(fragment as unknown as HellaElement, children);
    return fragment;
  }

  const element = createElement(tag as string) as HellaElement;

  if (props) {
    const { onUpdate, onDestroy, effects } = props;
    element.onUpdate = onUpdate;
    element.onDestroy = onDestroy;

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
      if (key.startsWith(ON)) {
        setNodeHandler(element, key.slice(2).toLowerCase(), value as EventListener);
        continue;
      }
      if (isFunction(value)) {
        addRegistryEffect(element, () => {
          renderProp(element, key, value());
          element.onUpdate?.();
        });
        continue;
      }
      renderProp(element, key, value);
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
        (child as (parent: Element) => void)(parent);
        continue;
      }

      const start = createComment(START),
        end = createComment(END);

      appendChild(parent, start);
      appendChild(parent, end);

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

        parent?.onUpdate?.()
      });

      continue;
    }

    const resolved = resolveValue(child);
    if (isText(resolved)) {
      appendChild(parent, createTextNode(normalizeTextValue(resolved)));
    } else if (isHellaNode(resolved)) {
      appendChild(parent, renderNode(resolved));
    }
  }
}