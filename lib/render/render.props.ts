import { isFalsy, isFunction, isObject, toError } from "../global";
import { HellaElement, PropHandler, PropValue } from "./render.types";
import { attachEvent } from "./render.events";
import {
  sanitizeValue,
  sanitizeUrl,
  shouldSanitizeProp,
} from "./render.sanitize";
import { validateEventHandler } from "./render.validation";

/* Mapping of prop types to their handlers for O(1) lookup */
const PROP_HANDLERS = new Map<string, PropHandler>([
  ["class", styleProp],
  ["css", styleProp],
  ["data", dataProp],
]);

const HIDDEN_KEYS = new Set(["onRender", "tag", "root"]);

/* Applies all valid properties from HellaElement to DOM element */
export function applyProps(
  domElement: HTMLElement,
  hellaElement: HellaElement
): void {
  if (!hellaElement) return;

  const rootSelector = hellaElement.root;
  const entries = Object.entries(hellaElement);

  for (const [key, value] of entries) {
    if (isFalsy(value) || key === "content") continue;

    const handler = propHandler(key);
    handler?.(domElement, key, value, rootSelector!);
  }
}

/* Determines appropriate prop handler based on property key */
function propHandler(key: string): PropHandler | null {
  if (HIDDEN_KEYS.has(key)) return null;
  if (PROP_HANDLERS.has(key)) return PROP_HANDLERS.get(key)!;
  return key.startsWith("on") ? eventProp : regularProp;
}

/* Safely updates DOM element attributes with sanitization */
function updateProp(
  domElement: HTMLElement,
  key: string,
  value: PropValue
): void {
  if (isFalsy(value)) {
    domElement.removeAttribute(key);
    return;
  }

  const sanitized = shouldSanitizeProp(key)
    ? sanitizeUrl(String(value))
    : sanitizeValue(value);

  domElement.setAttribute(key, sanitized);
}

/* Handles style and class property updates */
function styleProp(
  domElement: HTMLElement,
  key: string,
  value: PropValue
): void {
  const processedValue = key === "class" ? processClass(value) : value;
  updateProp(domElement, key, processedValue);
}

/* Processes class values into valid class string */
function processClass(value: any): string {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(" ");
  }

  if (isObject(value)) {
    return Object.entries(value)
      .reduce((classes, [className, active]) => {
        return active ? [...classes, className] : classes;
      }, [] as string[])
      .join(" ");
  }

  return String(value);
}

/* Handles regular property updates with reactive support */
function regularProp(
  domElement: HTMLElement,
  key: string,
  value: PropValue
): void {
  const resolvedValue = isFunction(value) ? value() : value;
  updateProp(domElement, key, resolvedValue);
}

/* Handles event binding with validation */
function eventProp(
  domElement: HTMLElement,
  key: string,
  handler: PropValue,
  rootSelector: string
): void {
  if (!isFunction(handler)) {
    throw toError("Event handlers must be a function");
  }

  if (!validateEventHandler(handler)) {
    throw toError("Invalid event handler detected");
  }

  const eventName = key.toLowerCase().slice(2);
  attachEvent({ domElement, eventName, handler, rootSelector });
}

/* Handles data-* attribute updates */
function dataProp(domElement: HTMLElement, _: string, value: PropValue): void {
  if (!isObject(value)) return;

  Object.entries(value).forEach(([key, val]) => {
    domElement.setAttribute(`data-${key}`, sanitizeValue(val));
  });
}
