import type { EventFn, ReactiveElement, Signal, VNode } from "../types";
import { setupSignal } from "./reactive";

// Map property names to their DOM attribute equivalents
export const PROP_MAP: Record<string, string> = {
  className: "class",
  htmlFor: "for",
};

/**
 * Creates a DOM element from a virtual node
 * @param vNode - Virtual node, string or number to create element from
 * @returns DOM node
 */
export function createElement(vNode: VNode): Node {
  if (typeof vNode !== "object") return document.createTextNode(String(vNode));

  // Special case for signals passed directly - unwrap them
  if (vNode instanceof Function && typeof (vNode as Signal<unknown>).subscribe === 'function') {
    // Create a text node with the signal's current value
    const textNode = document.createTextNode(String((vNode as Signal<unknown>)()));
    // Set up subscription to update the text node
    (vNode as Signal<unknown>).subscribe(value => {
      textNode.textContent = String(value);
    });
    return textNode;
  }

  const { type, props, children } = vNode;

  const element = document.createElement(type as string) as ReactiveElement;

  // Handle signal as a single child
  if (children?.length === 1) {
    if (children[0] instanceof Function && typeof ((children[0] as Signal<unknown>)).subscribe === 'function') {
      setupSignal(element, (children[0] as Signal<unknown>), "textContent");
      return element;
    }

    // Handle function that returns content (for reactive content)
    if (typeof children[0] === 'function') {
      const contentFn = children[0] as Signal<unknown>;
      // Set initial value
      element.textContent = String(contentFn());
      // Create effect to update content
      const cleanup = contentFn.subscribe(() => {
        element.textContent = String(contentFn());
      });
      // Store cleanup function for later
      element._cleanup = cleanup;
      return element;
    }
  }

  if (props) {
    for (const key in props) {
      const value = props[key];

      // Handle function props specially (for reactive attributes)
      if (typeof value === 'function' && !key.startsWith('on')) {
        // Create effect to update attribute
        const attrFn = value as Signal<unknown>;
        // Set initial value
        const initialValue = attrFn();
        if (key === 'className' || key === 'id' || key === 'textContent') {
          // Handle special properties directly
          setElementProperty(element, key, initialValue);
        } else if (key === 'style' && typeof initialValue === 'object') {
          Object.assign(element.style, initialValue as Partial<CSSStyleDeclaration>);
        } else {
          element.setAttribute(PROP_MAP[key] || key, String(initialValue));
        }

        // Setup effect for updates
        const cleanup = attrFn.subscribe(() => {
          const newValue = attrFn();
          if (key === 'className' || key === 'id' || key === 'textContent') {
            setElementProperty(element, key, newValue);
          } else if (key === 'style' && typeof newValue === 'object') {
            Object.assign(element.style, newValue as Partial<CSSStyleDeclaration>);
          } else {
            element.setAttribute(PROP_MAP[key] || key, String(newValue));
          }
        });

        // Store cleanup function
        element._cleanups = [...(element._cleanups || []), cleanup];
        continue;
      }

      if (key.startsWith("on") && typeof value === "function") {
        element.addEventListener(key.slice(2).toLowerCase(), value as EventFn);
        continue;
      }

      if (value instanceof Function && typeof (value as Signal<unknown>).subscribe === 'function') {
        setupSignal(element, value as Signal<unknown>, key);
        continue;
      }

      if (key === "dataset" && typeof value === "object") {
        for (const dataKey in value) {
          const dataVal = (value as Record<string, unknown>)[dataKey];
          typeof dataVal === "function" && typeof (dataVal as Signal<unknown>).subscribe === 'function'
            ? setupSignal(element, dataVal as Signal<unknown>, `data-${dataKey}`)
            : (element.dataset[dataKey] = String(dataVal));
        }
        continue;
      }

      const attrName = PROP_MAP[key] || key;
      // Fast path for common properties
      if (key === 'textContent' || key === 'className' || key === 'id') {
        setElementProperty(element, key, value);
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value as Partial<CSSStyleDeclaration>);
      } else {
        try {
          setElementProperty(element, key, value);
        } catch {
          element.setAttribute(attrName, String(value));
        }
      }
    }
  }

  if (children?.length) {
    const fragment = document.createDocumentFragment();
    for (const child of children) {
      if (child != null) {
        fragment.appendChild(
          typeof child === "object" || typeof child === "function"
            ? createElement(child as VNode)
            : document.createTextNode(String(child))
        );
      }
    }
    element.appendChild(fragment);
  }

  return element;
}

/**
 * Sets a property on an HTML element in a type-safe way
 * 
 * @param element - The element to set the property on
 * @param key - The property name
 * @param value - The property value
 */
export function setElementProperty<T extends HTMLElement>(element: T, key: string, value: unknown): void {
  if (key in element) {
    // Use type assertion with proper constraints
    (element as unknown as Record<string, unknown>)[key] = value;
  } else {
    // Fallback to setAttribute if direct property setting fails
    element.setAttribute(key, String(value));
  }
}