import {
  COMPONENT_REGISTRY,
  COMPONENT_REGISTRY_DEFAULTS,
  isReactiveProp,
} from "../global";
import { effect } from "../reactive";
import { HNode, PropHandler, PropValue } from "../types";
import { applyStyles } from "./css";
import { attachEvent } from "./events";

export function applyProps(element: HTMLElement, hnode: HNode): void {
  const { props } = hnode;
  const root = props.root || props.mount || "";

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
  if (key === "mount" || key === "onRender" || key === "tag" || key === "root")
    return null;
  if (key === "styles") return handleStyleProp;
  if (key.startsWith("on")) return handleEventProp;
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
  if (!component) {
    COMPONENT_REGISTRY.set(root, COMPONENT_REGISTRY_DEFAULTS);
    component = COMPONENT_REGISTRY.get(root);
  }
  component?.propEffects.add(cleanup);
}

function handleEventProp(
  element: HTMLElement,
  key: string,
  value: PropValue,
  root: string
): void {
  const eventName = key.toLowerCase().slice(2);
  if (typeof value === "function") {
    attachEvent(element, eventName, value, root);
  }
}

export function cleanupEffects(root: string): void {
  const component = COMPONENT_REGISTRY.get(root);
  if (!component) return;

  component.propEffects.forEach((cleanup) => cleanup());
  component.nodeEffects.forEach((cleanup) => cleanup());
  const element = document.querySelector(root);

  if (component) {
    const children = Array.from(element?.childNodes || []);
    for (const child of children) {
      if (child instanceof HTMLElement) {
        const childRoot = child.getAttribute("root");
        if (childRoot && childRoot !== root) {
          cleanupEffects(childRoot);
        }
      }
    }
  }
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
