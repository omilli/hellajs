import { HellaElement, RenderResult } from "./types";
import { componentRegistry, isFunction } from "../global";
import { applyProps } from "./props";
import { processChildren, diffNodes } from "./nodes";
import { getRootElement } from "./utils";
import { effect } from "../reactive";

// Renders a HellaElement dom tree
export function render(
  hellaElement: HellaElement | (() => HellaElement),
  rootSelector?: string
): RenderResult {
  if (!hellaElement) return;
  if (isFunction(hellaElement)) {
    if (!rootSelector) {
      throw new Error("No mount selector provided");
    }
    const cleanup = effect(() => renderEffect(hellaElement, rootSelector));
    return cleanup;
  }
  hellaElement.root ||= rootSelector;
  return renderElement(hellaElement, rootSelector);
}

function renderEffect(hellaElement: () => HellaElement, rootSelector: string) {
  const result = hellaElement();
  result.root = rootSelector;
  const root = getRootElement(rootSelector) as HTMLElement;
  const child = root.firstElementChild;
  const element = renderElement(result);
  if (child && element instanceof HTMLElement) {
    diffNodes(root, child, element, rootSelector);
  } else {
    mountElement(element, rootSelector);
  }
}

// Renders a single HellaElement
function renderElement(
  hellaElement: HellaElement,
  rootSelector?: string
): HTMLElement | DocumentFragment {
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
  const domElement = document.createElement(hellaElement.tag as string);
  applyProps(domElement, hellaElement);
  processChildren(domElement, hellaElement);
  return domElement;
}

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
  componentRegistry(rootSelector);
  if (!rootElement.firstElementChild) {
    rootElement.appendChild(element);
  }
}
