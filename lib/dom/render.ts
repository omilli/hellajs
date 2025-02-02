import { HellaElement, RenderResult } from "./types";
import { componentRegistry, isFunction } from "../global";
import { applyProps, cleanupPropEffects } from "./props";
import { processChildren } from "./nodes";
import { getRootElement } from "./utils";

// Renders a HellaElement dom tree
export function render(
  hellaElement: HellaElement | (() => HellaElement),
  rootSelector?: string
): RenderResult {
  if (!hellaElement) return;
  return isFunction(hellaElement)
    ? render(hellaElement(), rootSelector)
    : renderElement(hellaElement, rootSelector);
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

  const mountPoint = hellaElement.mount || rootSelector;
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
  cleanupPropEffects(rootSelector);
  rootElement.innerHTML = "";
  rootElement.appendChild(element);
}
