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
    const cleanup = effect(() => {
      const result = hellaElement();
      if (!rootSelector) {
        cleanup();
        throw new Error("No mount selector provided");
      } else {
        result.root = rootSelector;
      }
      const rootElement = getRootElement(rootSelector);
      const currentChild = rootElement.firstElementChild;
      const newElement = renderElement(result);
      if (currentChild && newElement instanceof HTMLElement) {
        diffNodes(
          rootElement as HTMLElement,
          currentChild,
          newElement,
          rootSelector
        );
      } else {
        mountElement(newElement, rootSelector);
      }
    });
    return cleanup;
  }
  hellaElement.root ||= rootSelector;
  return renderElement(hellaElement, rootSelector);
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
