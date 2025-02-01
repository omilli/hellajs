import { HellaElement, HNodeChildren } from "./types";
import { attachEvent } from "./events";
import { getRootElement } from "./utils";

export function mount(
  hellaElement: Required<Pick<HellaElement, "mount">> & HellaElement
) {
  const rootElement = getRootElement(hellaElement.mount);
  const mountedElement = createElement(hellaElement, hellaElement.mount);
  const currentChild = rootElement.firstElementChild;
  currentChild
    ? rootElement.replaceChild(mountedElement, currentChild)
    : rootElement.appendChild(mountedElement);
  return mountedElement;
}

function createElement(
  hellaElement: HellaElement,
  rootSelector: string
): HTMLElement {
  const { tag, children, ...props } = hellaElement;
  const domElement = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    key.startsWith("on")
      ? attachEvent(
          domElement,
          key.slice(2).toLowerCase(),
          value as any,
          rootSelector
        )
      : value && domElement.setAttribute(key, String(value));
  });
  processChildren(domElement, children, rootSelector);
  return domElement;
}

function processChildren(
  parent: HTMLElement,
  children: HNodeChildren | undefined,
  rootSelector: string
) {
  if (!children) return;
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach((child) => {
    if (!child) return;
    const node =
      typeof child === "object"
        ? createElement(child as HellaElement, rootSelector)
        : document.createTextNode(String(child));
    parent.appendChild(node);
  });
}
