import type { Signal } from "../types";
import { isObject, isSignal } from "../utils";
import { setupSignal } from "./reactive";
import { checkNullish } from "./utils";

// Map property names to their DOM attribute equivalents
export const PROP_MAP: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  objectData: "data"
};

/**
 * Sets a property on an HTML element in a type-safe way
 * 
 * @param element - The element to set the property on
 * @param key - The property name
 * @param value - The property value
 */
function setElementProperty<T extends HTMLElement>(element: T, key: string, value: unknown): void {
  // Skip setting properties with null, undefined or false values
  if (checkNullish(element, key, value)) return;

  if (key in element) {
    // Use type assertion with proper constraints
    (element as unknown as Record<string, unknown>)[key] = value;
  } else {
    // Fallback to setAttribute if direct property setting fails
    element.setAttribute(key, String(value));
  }
}

/**
 * Handles setting properties on an element
 * 
 * @param element - The element to set the property on
 * @param key - The property name
 * @param value - The property value
 */
export function handleProps<T extends HTMLElement>(element: T, key: string, value: unknown): void {
  // Skip rendering attributes with null, undefined or false values
  if (checkNullish(element, key, value)) return;

  // Handle class and className consistently
  if (key === 'class') {
    // Directly set className property and remove attribute if empty
    if (value === '') {
      element.className = '';
      element.removeAttribute('class');
    } else {
      element.className = String(value);
    }
  } else if (key === 'for') {
    // Handle 'for' attribute (htmlFor in DOM)
    setElementProperty(element, 'htmlFor', value);
  } else if (key === 'textContent' || key === 'id') {
    setElementProperty(element, key, value);
  } else if (key === 'style' && isObject(value)) {
    Object.assign(element.style, value as Partial<CSSStyleDeclaration>);
  } else if (key === "data" || key === "dataset") {
    // Handle data attributes - use data instead of dataset
    const datasetValue = isSignal(value) ? (value as Signal<unknown>)() : value;

    if (isObject(datasetValue)) {
      for (const dataKey in datasetValue) {
        const dataVal = (datasetValue as Record<string, unknown>)[dataKey];
        // Skip null/undefined/false dataset values
        if (dataVal === null || dataVal === undefined || dataVal === false) {
          // Remove the data attribute if it exists
          if (dataKey in element.dataset) {
            delete element.dataset[dataKey];
          }
          continue;
        }

        if (isSignal(dataVal)) {
          // If individual dataset value is a signal, set up reactive updates
          setupSignal(element, dataVal as Signal<unknown>, `data-${dataKey}`);
        } else {
          // Direct assignment to dataset property
          element.dataset[dataKey] = String(dataVal);
        }
      }
    }
  } else {
    try {
      setElementProperty(element, key, value);
    } catch {
      element.setAttribute(PROP_MAP[key] || key, String(value));
    }
  }
}