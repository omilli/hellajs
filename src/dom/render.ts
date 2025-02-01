import { HellaElement, RenderResult } from "./types";
import { componentRegistry, isFunction, isString } from "../global";
import { applyProps, cleanupPropEffects } from "./props";
import { processChildren } from "./nodes";
import { getRootElement } from "./utils";

export function render(
  hellaElement: HellaElement | (() => HellaElement),
  rootSelector?: string
): RenderResult {
  return isFunction(hellaElement)
    ? render(hellaElement(), rootSelector)
    : renderElement(hellaElement, rootSelector);
}

function renderElement(
  hellaElement: HellaElement,
  rootSelector?: string
): HTMLElement {
  const element = createElement(hellaElement);
  const { mount, onRender } = hellaElement;
  const shouldMount = isString(mount);
  if (shouldMount) {
    mountElement(element, rootSelector || mount);
  }
  onRender && onRender(element);
  return element;
}

function createElement(hellaElement: HellaElement): HTMLElement {
  const domElement = document.createElement(hellaElement.tag as string);
  applyProps(domElement, hellaElement);
  processChildren(domElement, hellaElement);
  return domElement;
}

function mountElement(domElement: HTMLElement, rootSelector: string): void {
  const rootElement = getRootElement(rootSelector);
  componentRegistry(rootSelector);
  cleanupPropEffects(rootSelector);
  rootElement.innerHTML = "";
  rootElement.appendChild(domElement);
}
