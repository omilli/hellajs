import { componentRegistry, isReactiveProp } from "../global";
import { effect } from "../reactive";
import { HNode, PropHandler, PropValue } from "../types";
import { applyStyles } from "./css";
import { attachEvent } from "./events";

export function applyProps(element: HTMLElement, hnode: HNode): void {
  const { props } = hnode;
  const root = props.root || props.mount || "";
  Object.entries(props || {}).forEach(([key, value]) => {
    const handler = getPropHandler(key);
    handler && handler(element, key, value, root);
  });
}

function updateProp(element: HTMLElement, key: string, value: PropValue): void {
  if (value == null || value === false) {
    element.removeAttribute(key);
    return;
  }
  if (typeof value === "object") {
    Object.assign((element as any)[key], value);
    return;
  }
  if (typeof value === "boolean") {
    value && element.setAttribute(key, "");
    return;
  }
  element.setAttribute(key, value.toString());
}

function getPropHandler(key: string): PropHandler | null {
  if (key === "mount" || key === "onRender" || key === "tag" || key === "root")
    return null;
  if (key === "css") return handleStyleProp;
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
  isReactiveProp(value)
    ? handleReactiveProp(element, key, value, root)
    : updateProp(element, key, value);
}

function handleReactiveProp(
  element: HTMLElement,
  key: string,
  value: PropValue,
  root: string
): void {
  const cleanup = effect(() => updateProp(element, key, value?.()));
  const component = componentRegistry(root);
  component.propEffects.add(cleanup);
}

function handleEventProp(
  element: HTMLElement,
  key: string,
  value: PropValue,
  root: string
): void {
  typeof value === "function" &&
    attachEvent(element, key.toLowerCase().slice(2), value, root);
}

export function cleanupEffects(root: string): void {
  const component = componentRegistry(root);
  component.propEffects.forEach((cleanup) => cleanup());
  component.nodeEffects.forEach((cleanup) => cleanup());
  const element = document.querySelector(root);
  if (!component) return;
  const children = Array.from(element?.childNodes || []);
  for (const child of children) {
    if (child instanceof HTMLElement) {
      const childRoot = child.getAttribute("root");
      childRoot && childRoot !== root && cleanupEffects(childRoot);
    }
  }
}
