import { COMPONENT_REGISTRY, isReactiveProp } from "../global";
import { effect } from "../reactive";
import { HNode, PropHandler, PropValue } from "../types";
import { applyStyles } from "./css";

export function applyProps(element: HTMLElement, hnode: HNode): void {
  const { props } = hnode;
  const root = props.root;
  Object.entries(props || {}).forEach(([key, value]) => {
    const handler = getPropHandler(key);
    if (handler) handler(element, key, value, root);
  });
}

function updateProp(element: HTMLElement, key: string, value: PropValue): void {
  if (shouldRemoveAttribute(value)) {
    element.removeAttribute(key);
    return;
  }

  if (typeof value === "object") {
    Object.assign((element as any)[key], value);
    return;
  }

  if (typeof value === "boolean") {
    handleBooleanAttribute(element, key, value);
    return;
  }

  element.setAttribute(key, value.toString());
}

function getPropHandler(key: string): PropHandler | null {
  if (key === "mount" || key.startsWith("on")) return null;
  if (key === "styles") return handleStyleProp;
  return handleRegularProp;
}

function handleStyleProp(
  element: HTMLElement,
  _: string,
  value: PropValue
): void {
  applyStyles(element, value);
}

function handleRegularProp(
  element: HTMLElement,
  key: string,
  value: PropValue,
  root: string
): void {
  if (isReactiveProp(value)) {
    handleReactiveProp(element, key, value, root);
  } else {
    updateProp(element, key, value);
  }
}

function handleReactiveProp(
  element: HTMLElement,
  key: string,
  value: PropValue,
  root: string
): void {
  const cleanup = effect(() => updateProp(element, key, value?.()));

  let component = COMPONENT_REGISTRY.get(root);
  console.log("cleanup", component);
  if (!component) {
    COMPONENT_REGISTRY.set(root, {
      element: element,
      propEffects: new Set(),
      nodeEffects: new Set(),
    });
    component = COMPONENT_REGISTRY.get(root);
  }
  component?.propEffects.add(cleanup);
}

export function cleanupEffects(root: string): void {
  const component = COMPONENT_REGISTRY.get(root);
  if (!component) return;

  component.propEffects.forEach((cleanup) => cleanup());
  component.nodeEffects.forEach((cleanup) => cleanup());

  const rootElement = component.element;
  Array.from(rootElement.children).forEach((child) => {
    if (child instanceof HTMLElement) {
      cleanupEffects(root);
    }
  });
}

function handleBooleanAttribute(
  element: HTMLElement,
  key: string,
  value: boolean
): void {
  if (value) element.setAttribute(key, "");
}

function shouldRemoveAttribute(value: PropValue): boolean {
  return value == null || value === false;
}
