import { HellaElement } from "./render.types";
import { CleanupFunction, isFunction, toError } from "../global";
import { applyProps } from "./render.props";
import { processChildren, diffNodes } from "./render.nodes";
import { getRootElement } from "./render.utils";
import { effect } from "../reactive";
import {
  cleanupDelegatedEvents,
  removeDelegatedListeners,
} from "./render.events";
import { validateTag, validateElementDepth } from "./render.validation";
import { removeComponentRegistry } from "./render.global";

/**
 * Renders a HellaElement or reactive component to the DOM
 */
export function render(
  hellaElement: HellaElement | (() => HellaElement),
  rootSelector?: string
): CleanupFunction {
  if (!hellaElement) return () => void 0;
  return isFunction(hellaElement)
    ? reactiveRender(hellaElement as () => HellaElement, rootSelector)
    : (renderElement(
        hellaElement as HellaElement,
        rootSelector
      ) as unknown as CleanupFunction);
}

/**
 * Creates an effect to watch for reactive changes
 */
function reactiveRender(
  hellaElement: () => HellaElement,
  rootSelector?: string
): CleanupFunction {
  if (!rootSelector) throw toError("No mount selector provided");

  const dispose = effect(() => renderEffect(hellaElement, rootSelector));

  return () => {
    dispose();
    removeDelegatedListeners(rootSelector);
    removeComponentRegistry(rootSelector);
  };
}

/**
 * Diff or mount a HellaElement
 */
function renderEffect(
  hellaElementFn: () => HellaElement,
  rootSelector: string
) {
  const hellaElement = hellaElementFn();
  hellaElement.root = rootSelector;
  const parent = getRootElement(rootSelector) as HTMLElement;
  const currentNode = parent.firstElementChild;
  const newNode = renderElement(hellaElement);
  if (currentNode && newNode instanceof HTMLElement) {
    diffNodes({ parent, currentNode, newNode, rootSelector });
  } else {
    mountElement(newNode, rootSelector);
  }
  cleanupDelegatedEvents(rootSelector);
}

/**
 * Renders a single HellaElement
 */
function renderElement(
  hellaElement: HellaElement,
  rootSelector?: string
): HTMLElement | DocumentFragment {
  hellaElement.onPreRender && hellaElement.onPreRender();
  const isFragment = !hellaElement.tag;
  const element = isFragment
    ? createFragmentElement(hellaElement)
    : createElement(hellaElement);

  const mountPoint = hellaElement.root || rootSelector;
  mountPoint && mountElement(element, mountPoint);
  !isFragment &&
    hellaElement.onRender &&
    hellaElement.onRender(element as HTMLElement);

  return element;
}

/**
 * Creates a DOM element with security checks
 */
function createElement(hellaElement: HellaElement): HTMLElement {
  const { root, tag } = hellaElement;
  const parentElement = root ? document.querySelector(root) : null;
  const depth = parentElement ? getElementDepth(parentElement) : 0;

  if (!validateElementDepth(depth)) {
    throw toError(`Maximum element depth of 32 exceeded`);
  }

  if (!validateTag(tag as string)) {
    throw toError(`"Invalid tag type:" ${tag}`);
  }

  const element = document.createElement(tag as string);
  const fragment = document.createDocumentFragment();
  fragment.appendChild(element);

  applyProps(element, hellaElement);
  processChildren(element, hellaElement);

  return fragment.firstElementChild as HTMLElement;
}

/**
 * Optimized depth calculation
 */
function getElementDepth(element: Element): number {
  return element.parentElement ? getElementDepth(element.parentElement) + 1 : 0;
}

/**
 * Creates a DocumentFragment for efficient batch rendering
 */
function createFragmentElement(hellaElement: HellaElement): DocumentFragment {
  const fragment = document.createDocumentFragment();
  processChildren(fragment as unknown as HTMLElement, hellaElement);
  return fragment;
}

/**
 * Mounts an element with cleanup registration
 */
function mountElement(
  element: HTMLElement | DocumentFragment,
  rootSelector: string
): void {
  const root = getRootElement(rootSelector);
  if (!root) throw toError(`Invalid mount point: ${rootSelector}`);

  if (!root.firstElementChild) {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(element);
    root.appendChild(fragment);
  }
}
