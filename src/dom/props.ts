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

// Applies props from HellaElement objects to html elements
export function applyProps(
  domElement: HTMLElement,
  hellaElement: HellaElement
): void {
  if (!hellaElement) return;
  const rootSelector = hellaElement.root || hellaElement.mount;
  Object.entries(hellaElement)
    .filter(([key, value]) => !isFalsy(value) && key === "children")
    .forEach(([key, value]) => {
      const handler = getPropHandler(key);
      handler && handler(domElement, key, value, rootSelector!);
    });
}

// Cleanup property effects when unmounting components
export function cleanupPropEffects(rootSelector: string): void {
  const component = componentRegistry(rootSelector);
  component.propEffects.forEach((cleanup) => cleanup());
  component.nodeEffects.forEach((cleanup) => cleanup());
  const domElement = document.querySelector(rootSelector);
  const children = Array.from(domElement?.childNodes || []);
  for (const child of children) {
    child instanceof HTMLElement && cleanupPropEffects(rootSelector);
  }
}

// Process class names for dynamic and conditional classes
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

// Updates domElement props based on type and value
function updateProp(
  domElement: HTMLElement,
  key: string,
  value: PropValue
): void {
  switch (true) {
    case isFalsy(value):
      domElement.removeAttribute(key);
      break;
    case isObject(value):
      Object.assign((domElement as any)[key], value);
      break;
    case isBoolean(value):
      value && domElement.setAttribute(key, "");
      break;
    default:
      domElement.setAttribute(key, value.toString());
  }
}

// Determines correct handler for different prop types
function getPropHandler(key: string): PropHandler | null {
  const hiddenKeys = ["mount", "onRender", "tag", "rootSelector"];
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

// Handles css and class props separately from regular props
function handleStyleProp(
  domElement: HTMLElement,
  key: string,
  value: PropValue
): void {
  switch (key) {
    case "css":
      applyStyles(domElement, value);
      return;
    case "class":
      updateProp(domElement, key, processClassValue(value));
      return;
    default:
      updateProp(domElement, key, value);
  }
}

// Process and update regular domElement props
function handleRegularProp(
  domElement: HTMLElement,
  key: string,
  value: PropValue,
  rootSelector: string
): void {
  isReactiveProp(value)
    ? handleReactiveProp(domElement, key, value, rootSelector)
    : updateProp(domElement, key, value);
}

// Sets up reactivity for dynamic props
function handleReactiveProp(
  domElement: HTMLElement,
  key: string,
  handler: PropValue,
  rootSelector: string
): void {
  const cleanup = effect(() => updateProp(domElement, key, handler?.()));
  const component = componentRegistry(rootSelector);
  component.propEffects.add(cleanup);
}

// Delegates dom events to the rootSelector domElement
function handleEventProp(
  domElement: HTMLElement,
  key: string,
  handler: PropValue,
  rootSelector: string
): void {
  const eventName = key.toLowerCase().slice(2);
  if (isFunction(handler)) {
    attachEvent(domElement, eventName, handler, rootSelector);
  } else {
    throw new Error("Event handlers must be a function");
  }
}
