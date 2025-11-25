import { addRegistryEffect, setNodeHandler, addHook, registerPendingOp, isFunction, renderProp, normalizeTextValue, objectLoop } from "./internal";
import type { ReactiveElement, ReactiveElements, HellaPrimitive, HellaProps, DOMEventMap, HellaElement, ElementHooks, HookType } from "./types";

/**
 * Selects a single DOM element and returns a reactive wrapper.
 * If element doesn't exist yet, operations are queued and executed when element appears.
 * @param selector - CSS selector string to find the element
 * @returns Reactive element wrapper with text(), attr(), and on() methods
 */
export function element<T extends Element = Element>(selector: string): ReactiveElement<T> {
  const targetNode = document.querySelector(selector) as T | null;
  return reactiveElement(targetNode, selector);
}

/**
 * Selects multiple DOM elements and returns a reactive array wrapper.
 * Unlike element(), this does not support lazy binding since multiple elements may appear.
 * @param selector - CSS selector string to find the elements
 * @returns Reactive elements array with forEach() method and element wrappers
 */
export function elements<T extends Element = Element>(selector: string): ReactiveElements<T> {
  const nodes = document.querySelectorAll(selector) as NodeListOf<T>;
  const elementWrappers: ReactiveElement<T>[] = [];

  let i = 0;
  while (i < nodes.length) {
    elementWrappers[i] = reactiveElement(nodes[i]);
    i++;
  }

  const result: ReactiveElements<T> = Object.assign(elementWrappers, {
    forEach: (callback: (element: ReactiveElement<T>, index: number) => void): ReactiveElements<T> => {
      let i = 0, l = elementWrappers.length;
      while (i < l) {
        callback(elementWrappers[i], i);
        i++;
      }
      return result;
    }
  });

  return result;
}

/**
 * Apply text to a target node (handles form elements vs regular elements)
 */
function applyText(targetNode: Element, hellaElement: HellaElement, value: HellaPrimitive) {
  const tagName = targetNode.tagName?.toLowerCase();
  const isFormElement = tagName === 'input' || tagName === 'textarea' || tagName === 'select';

  if (isFormElement && 'value' in targetNode) {
    const formElement = targetNode as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    isFunction(value)
      ? addRegistryEffect(hellaElement, () => formElement.value = normalizeTextValue(value()))
      : formElement.value = normalizeTextValue(value);
  } else {
    isFunction(value)
      ? addRegistryEffect(hellaElement, () => targetNode.textContent = normalizeTextValue(value()))
      : targetNode.textContent = normalizeTextValue(value);
  }
}

/**
 * Apply attributes to a target node
 */
function applyAttrs(targetNode: Element, hellaElement: HellaElement, attributes: HellaProps) {
  const attrs = Object.entries(attributes);
  for (const [key, value] of attrs) {
    isFunction(value)
      ? addRegistryEffect(hellaElement, () => renderProp(targetNode, key, value()))
      : renderProp(targetNode, key, value);
  }
}

/**
 * Apply event handler to a target node
 */
function applyEvent(hellaElement: HellaElement, event: string, handler: EventListener) {
  setNodeHandler(hellaElement, event, handler);
}

/**
 * Apply hooks to a target node
 */
function applyHooks(hellaElement: HellaElement, hooksObj: ElementHooks) {
  objectLoop(hooksObj as Record<string, unknown>, (type, fn) => {
    addHook(hellaElement, type as HookType, fn as () => void);
    type === "mount" && hellaElement.__hella_mounted && (fn as () => void)();
  });
}

/**
 * Creates a reactive element wrapper for a given DOM node.
 * Supports lazy binding when selector is provided and node is null.
 * @param targetNode - The DOM element to wrap (null if not yet available)
 * @param selector - Optional CSS selector for lazy binding
 * @returns Reactive element wrapper with text(), attr(), on(), and lifecycle methods
 */
function reactiveElement<T extends Element>(targetNode: T | null, selector?: string): ReactiveElement<T> {
  // Cached reference - updated when lazy binding resolves
  let cachedNode = targetNode;
  let hellaElement = targetNode as HellaElement | null;

  const wrapper: ReactiveElement<T> = {
    text: (value: HellaPrimitive) => {
      if (cachedNode) {
        applyText(cachedNode, hellaElement!, value);
      } else if (selector) {
        registerPendingOp(selector, (node) => {
          cachedNode = node as T;
          hellaElement = node as HellaElement;
          applyText(node, hellaElement, value);
        });
      }
      return wrapper;
    },

    attr: (attributes: HellaProps) => {
      if (cachedNode) {
        applyAttrs(cachedNode, hellaElement!, attributes);
      } else if (selector) {
        registerPendingOp(selector, (node) => {
          cachedNode = node as T;
          hellaElement = node as HellaElement;
          applyAttrs(node, hellaElement, attributes);
        });
      }
      return wrapper;
    },

    on: <K extends keyof DOMEventMap>(event: K, handler: (this: Element, event: DOMEventMap[K]) => void) => {
      if (hellaElement) {
        applyEvent(hellaElement, event as string, handler as EventListener);
      } else if (selector) {
        registerPendingOp(selector, (node) => {
          cachedNode = node as T;
          hellaElement = node as HellaElement;
          applyEvent(hellaElement, event as string, handler as EventListener);
        });
      }
      return wrapper;
    },

    hooks: (hooksObj: ElementHooks) => {
      if (hellaElement) {
        applyHooks(hellaElement, hooksObj);
      } else if (selector) {
        registerPendingOp(selector, (node) => {
          cachedNode = node as T;
          hellaElement = node as HellaElement;
          applyHooks(hellaElement, hooksObj);
        });
      }
      return wrapper;
    },

    get node() {
      // If we have a cached node, return it
      if (cachedNode) return cachedNode;
      // If selector provided, try to re-query
      if (selector) {
        cachedNode = document.querySelector(selector) as T | null;
        hellaElement = cachedNode as HellaElement | null;
      }
      return cachedNode;
    }
  };

  return wrapper;
}