import { HellaElement, CleanupFunction } from "./types";
import { isFunction } from "../global";
import { applyProps } from "./props";
import { processChildren, diffNodes } from "./nodes";
import { getRootElement } from "./utils";
import { effect } from "../reactive";
import { cleanupDelegatedEvents, removeDelegatedListeners } from "./events";
import { validateTag, validateElementDepth } from "./validation";
import { removeComponentRegistry } from "./global";

// Renders a HellaElement dom tree
export function render(
  hellaElement: HellaElement | (() => HellaElement),
  rootSelector?: string
): CleanupFunction {
  if (!hellaElement) return () => {};
  return isFunction(hellaElement)
    ? reactiveRender(hellaElement as () => HellaElement, rootSelector)
    : (renderElement(
        hellaElement as HellaElement,
        rootSelector
      ) as unknown as CleanupFunction);
}

// Creates an effect to watch for reactive changes
function reactiveRender(
  hellaElement: () => HellaElement,
  rootSelector?: string
): CleanupFunction {
  if (!rootSelector) {
    throw new Error("No mount selector provided");
  }
  const cleanup = effect(() => renderEffect(hellaElement, rootSelector));
  return () => {
    cleanup();
    removeDelegatedListeners(rootSelector);
    removeComponentRegistry(rootSelector);
  };
}

// Diff or mount a HellaElement
function renderEffect(
  hellaElementFn: () => HellaElement,
  rootSelector: string
) {
  const hellaElement = hellaElementFn();
  hellaElement.root = rootSelector;
  const root = getRootElement(rootSelector) as HTMLElement;
  const child = root.firstElementChild;
  const element = renderElement(hellaElement);
  if (child && element instanceof HTMLElement) {
    diffNodes(root, child, element, rootSelector);
  } else {
    mountElement(element, rootSelector);
  }
  cleanupDelegatedEvents(rootSelector);
}

// Renders a single HellaElement
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

// Creates a dom element from a HellaElement
function createElement(hellaElement: HellaElement): HTMLElement {
  let depth = 0;
  const parentElement = hellaElement.root
    ? document.querySelector(hellaElement.root)
    : null;
  depth = parentElement ? getElementDepth(parentElement) : 0;

  if (!validateElementDepth(depth)) {
    throw new Error("Maximum element depth exceeded");
  }

  if (!validateTag(hellaElement.tag as string)) {
    throw new Error(`Invalid tag type: ${hellaElement.tag}`);
  }

  const domElement = document.createElement(hellaElement.tag as string);
  applyProps(domElement, hellaElement);
  processChildren(domElement, hellaElement);
  return domElement;
}

// Checks node depth for security
function getElementDepth(element: Element): number {
  let depth = 0;
  let parent = element.parentElement;
  while (parent) {
    depth++;
    parent = parent.parentElement;
  }
  return depth;
}

// Creates a document fragment from a HellaElement
function createFragmentElement(hellaElement: HellaElement): DocumentFragment {
  const fragment = document.createDocumentFragment();
  processChildren(fragment as unknown as HTMLElement, hellaElement);
  return fragment;
}

// Mounts a root element to the dom
function mountElement(
  element: HTMLElement | DocumentFragment,
  rootSelector: string
): void {
  const rootElement = getRootElement(rootSelector);
  if (!rootElement.firstElementChild) {
    rootElement.appendChild(element);
  }
}
