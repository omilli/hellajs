import {
  componentRegistry,
  isBoolean,
  isFalsy,
  isFunction,
  isObject,
  isReactiveProp,
} from "../global";
import { effect } from "../reactive";
import { HellaElement, PropHandler, PropValue } from "./types";
import { attachEvent } from "./events";
import { applyStyles } from "../css";

export function applyProps(
  element: HTMLElement,
  hellaElement: HellaElement
): void {
  if (!hellaElement) return;
  const root = hellaElement.root || hellaElement.mount;
  Object.entries(hellaElement).forEach(([key, value]) => {
    if (isFalsy(value) || key === "children") return;
    const handler = getPropHandler(key);
    handler && handler(element, key, value, root!);
  });
}

export function cleanupEffects(root: string): void {
  const component = componentRegistry(root);
  component.propEffects.forEach((cleanup) => cleanup());
  component.nodeEffects.forEach((cleanup) => cleanup());
  const element = document.querySelector(root);
  const children = Array.from(element?.childNodes || []);
  for (const child of children) {
    child instanceof HTMLElement && cleanupEffects(root);
  }
}

function updateProp(element: HTMLElement, key: string, value: PropValue): void {
  switch (true) {
    case isFalsy(value):
      element.removeAttribute(key);
      break;
    case isObject(value):
      Object.assign((element as any)[key], value);
      break;
    case isBoolean(value):
      value && element.setAttribute(key, "");
      break;
    default:
      element.setAttribute(key, value.toString());
  }
}

function getPropHandler(key: string): PropHandler | null {
  const hiddenKeys = ["mount", "onRender", "tag", "root"];
  switch (true) {
    case hiddenKeys.includes(key):
      return null;
    case key === "css" || key === "class":
      return handleStyleProp;
    case key.startsWith("on"):
      return handleEventProp;
    default:
      return handleRegularProp;
  }
}

export function processClassValue(value: any): string {
  switch (true) {
    case Array.isArray(value):
      return value.filter(Boolean).join(" ");
    case isObject(value):
      return Object.entries(value)
        .filter(([_, active]) => Boolean(active))
        .map(([className]) => className)
        .join(" ");
    default:
      return String(value);
  }
}

function handleStyleProp(
  element: HTMLElement,
  key: string,
  value: PropValue
): void {
  switch (key) {
    case "css":
      applyStyles(element, value);
      return;
    case "class":
      updateProp(element, key, processClassValue(value));
      return;
    default:
      updateProp(element, key, value);
  }
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
  handler: PropValue,
  root: string
): void {
  const cleanup = effect(() => updateProp(element, key, handler?.()));
  const component = componentRegistry(root);
  component.propEffects.add(cleanup);
}

function handleEventProp(
  element: HTMLElement,
  key: string,
  handler: PropValue,
  root: string
): void {
  const eventName = key.toLowerCase().slice(2);
  if (isFunction(handler)) attachEvent(element, eventName, handler, root);
  else throw new Error("Event handler must be a function");
}
