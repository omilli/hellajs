import type { HellaElement, HellaNode, HellaChild } from "./types";
import { setNodeHandler } from "./events";
import { addRegistryEffect } from "./registry";
import { DOC, isFunction, isText, isHellaNode, appendChild, createTextNode, EMPTY, FRAGMENT, createDocumentFragment, createElement, ON, createComment, START, END, insertBefore, renderProp, normalizeTextValue } from "./utils";

/**
 * Mounts a HellaNode to a DOM element.
 * @param node The component function or HellaNode to mount.
 * @param rootSelector="#app" The CSS selector for the root element.
 */
export function mount(node: (() => HellaNode) | HellaNode, rootSelector: string = "#app") {
  const resolvedNode = isFunction(node) ? node() : node;
  DOC.querySelector(rootSelector)?.replaceChildren(renderNode(resolvedNode));
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
    addRegistryEffect(textNode, () =>
      textNode.textContent = normalizeTextValue(value())
    );
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
    const propKeys = Object.keys(props);
    let index = 0, length = propKeys.length;

    for (; index < length; index++) {
      const key = propKeys[index],
        value = props[key];
      if (key.startsWith(ON)) {
        setNodeHandler(element, key.slice(2).toLowerCase(), value as EventListener);
        continue;
      } else {
        if (isFunction(value)) {
          addRegistryEffect(element, () =>
            renderProp(element, key, value())
          );
          continue;
        }

        renderProp(element, key, value);
      }
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

  const staticFragment = createDocumentFragment();
  let hasStatic = false,
    index = 0, length = children.length;
  for (; index < length; index++) {
    const child = children[index];

    if (isFunction(child)) {
      // Flush any pending static nodes before handling dynamic
      if (hasStatic) {
        appendChild(parent, staticFragment);
        hasStatic = false;
      }

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
          let child;
          while (child = newNode.firstChild)
            actualParent.insertBefore(child, end);
        } else {
          actualParent.insertBefore(newNode, end);
        }
      });

      continue;
    }

    if (isText(child)) {
      appendChild(staticFragment, createTextNode(normalizeTextValue(child)));
      hasStatic = true;
    } else if (isHellaNode(child)) {
      appendChild(staticFragment, renderNode(child));
      hasStatic = true;
    }
  }

  // Append any remaining static nodes
  if (hasStatic) {
    appendChild(parent, staticFragment);
  }
}