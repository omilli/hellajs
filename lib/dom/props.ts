import { isFalsy, isFunction, isObject } from "../global";
import { HellaElement, PropHandler, PropValue } from "./types";
import { attachEvent } from "./events";

// Applies props from HellaElement objects to html elements
export function applyProps(
  domElement: HTMLElement,
  hellaElement: HellaElement
): void {
  if (!hellaElement) return;
  const rootSelector = hellaElement.root;
  Object.entries(hellaElement)
    .filter(([key, value]) => !isFalsy(value) && key !== "content")
    .forEach(([key, value]) => {
      const handler = propHandler(key);
      handler && handler(domElement, key, value, rootSelector!);
    });
}

// Determines correct handler for different prop types
function propHandler(key: string): PropHandler | null {
  const hiddenKeys = ["mount", "onRender", "tag", "rootSelector", "root"];
  switch (true) {
    case hiddenKeys.includes(key):
      return null;
    case key === "css" || key === "class":
      return styleProp;
    case key === "data":
      return dataProp;
    case key.startsWith("on"):
      return eventProp;
    default:
      return regularProp;
  }
}

// Updates domElement props based on type and value
function updateProp(
  domElement: HTMLElement,
  key: string,
  value: PropValue
): void {
  const isNullOrUndefined = isFalsy(value);
  isNullOrUndefined
    ? domElement.removeAttribute(key)
    : domElement.setAttribute(key, value.toString());
}

// Handles css and class props separately from regular props
function styleProp(
  domElement: HTMLElement,
  key: string,
  value: PropValue
): void {
  switch (key) {
    case "class":
      updateProp(domElement, key, processClass(value));
      return;
    default:
      updateProp(domElement, key, value);
  }
}

// Process class names for dynamic and conditional classes
function processClass(value: any): string {
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

// Process and update regular domElement props
function regularProp(
  domElement: HTMLElement,
  key: string,
  value: PropValue
): void {
  if (isFunction(value)) {
    const result = isFunction(value) ? value() : value;
    updateProp(domElement, key, result);
    return;
  }
  updateProp(domElement, key, value);
}

// Delegates dom events to the rootSelector domElement
function eventProp(
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

function dataProp(domElement: HTMLElement, _: string, value: PropValue): void {
  isObject(value) &&
    Object.entries(value).forEach(([k, v]) =>
      domElement.setAttribute(`data-${k}`, String(v))
    );
}
