import type { EventFn, ReactiveElement, Signal, VNode } from "../types";
import { isFunction, isObject, isSignal } from "../utils";
import { setupSignal } from "./reactive";
import { checkNullish } from "./utils";

// Map property names to their DOM attribute equivalents
export const PROP_MAP: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  objectData: "data"
};


/**
 * Process element properties efficiently
 */
export function processProps(
  element: ReactiveElement,
  props: Record<string, unknown>
) {
  for (const key in props) {
    const value = props[key];

    // Skip key prop (used only for reconciliation)
    if (key === "key") continue;

    // Fast path for event handlers
    if (key.startsWith("on") && isFunction(value)) {
      element.addEventListener(key.slice(2).toLowerCase(), value as EventFn);
      continue;
    }

    // Handle signals
    if (isSignal(value)) {
      setupSignal(element, value as Signal<unknown>, key);
      continue;
    }

    // Regular values
    handleProps(element, key, value as string);
  }
}

/**
 * Handles setting properties on an element
 */
export function handleProps<T extends HTMLElement>(
  element: T,
  key: string,
  value: string
) {
  // Skip nullish values early
  if (checkNullish(element, key, value)) return;

  // Fast paths for common properties
  switch (key) {
    case 'class':
      element.className = value || '';
      return;

    case 'textContent':
      element.textContent = value;
      return;

    case 'id':
      element.id = value;
      return;

    case 'style':
      if (isObject(value)) {
        Object.assign(element.style, value as Partial<CSSStyleDeclaration>);
      } else {
        element.style.cssText = value as string;
      }
      return;

    case "data":
      handleDataAttributes(element, value);
      return;
    case 'for':
      (element as unknown as HTMLLabelElement).htmlFor = value;
      return;
  }

  // General case - try direct property setting first
  try {
    setElementProperty(element, key, value);
  } catch {
    element.setAttribute(PROP_MAP[key] || key, value as string);
  }
}

/**
 * Handle data attributes efficiently
 */
function handleDataAttributes<T extends HTMLElement>(
  element: T,
  value: unknown
) {
  const datasetValue = isSignal(value) ? (value as Signal<unknown>)() : value;

  if (!isObject(datasetValue)) return;

  for (const dataKey in datasetValue) {
    const dataVal = (datasetValue as Record<string, unknown>)[dataKey];

    // Remove attribute if nullish
    if (dataVal === null || dataVal === undefined || dataVal === false) {
      delete element.dataset[dataKey];
      continue;
    }

    // Handle reactive data attributes
    if (isSignal(dataVal)) {
      setupSignal(element, dataVal as Signal<unknown>, `data-${dataKey}`);
    } else {
      element.dataset[dataKey] = dataVal as string;
    }
  }
}


/**
 * Sets a property on an HTML element in a type-safe way
 */
function setElementProperty<T extends HTMLElement>(
  element: T,
  key: string,
  value: unknown
) {
  // Skip setting properties with null, undefined or false values
  if (checkNullish(element, key, value)) return;

  if (key in element) {
    // Use type assertion with proper constraints
    (element as unknown as Record<string, unknown>)[key] = value;
  } else {
    // Fallback to setAttribute if direct property setting fails
    element.setAttribute(key, value as string);
  }
}