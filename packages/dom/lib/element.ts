import { addRegistryEffect, addLoadCallback, addPendingLoadCallback, queueOperation, isNodeConnected } from "./registry";
import { setNodeHandler } from "./events";
import { isFunction, renderProp, normalizeTextValue } from "./utils";
import type { ReactiveElement, ReactiveElements, HellaPrimitive, HellaProps, DOMEventMap } from "./types";

/**
 * Selects a single DOM element and returns a reactive wrapper
 * @param selector - CSS selector string to find the element
 * @returns Reactive element wrapper with text(), attr(), and on() methods
 */
export function element<T extends Element = Element>(selector: string): ReactiveElement<T> {
  const targetNode = document.querySelector(selector) as T | null;
  return reactiveElement(targetNode, selector);
}

/**
 * Selects multiple DOM elements and returns a reactive array wrapper
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
 * Creates a reactive element wrapper for a given DOM node
 * @param targetNode - The DOM element to wrap
 * @param selector - Optional CSS selector for pending callbacks
 * @returns Reactive element wrapper with text(), attr(), on(), and onLoad() methods
 */
function reactiveElement<T extends Element>(targetNode: T | null, selector?: string): ReactiveElement<T> {
  const reactiveElement: ReactiveElement<T> = {
    text: (value: HellaPrimitive) => {
      if (!targetNode) return reactiveElement;

      const operation = () => {
        const tagName = targetNode.tagName?.toLowerCase();
        const isFormElement = tagName === 'input' || tagName === 'textarea' || tagName === 'select';

        if (isFormElement && 'value' in targetNode) {
          const formElement = targetNode;
          isFunction(value) ?
            addRegistryEffect(targetNode, () => formElement.value = normalizeTextValue(value()))
            : formElement.value = normalizeTextValue(value);
        } else {
          isFunction(value) ?
            addRegistryEffect(targetNode, () => targetNode.textContent = normalizeTextValue(value()))
            : targetNode.textContent = normalizeTextValue(value);
        }
      };

      isNodeConnected(targetNode) ? operation() : queueOperation(targetNode, operation);
      return reactiveElement;
    },

    attr: (attributes: HellaProps) => {
      if (!targetNode) return reactiveElement;

      const operation = () => {
        const attrs = Object.entries(attributes);
        let i = 0;
        while (i < attrs.length) {
          const [key, value] = attrs[i++];
          isFunction(value) ?
            addRegistryEffect(targetNode, () => renderProp(targetNode, key, value()))
            : renderProp(targetNode, key, value);
        }
      };

      isNodeConnected(targetNode) ? operation() : queueOperation(targetNode, operation);
      return reactiveElement;
    },

    on: <K extends keyof DOMEventMap>(event: K, handler: (this: Element, event: DOMEventMap[K]) => void) => {
      if (!targetNode) return reactiveElement;

      const operation = () => setNodeHandler(targetNode, event, handler as EventListener);
      isNodeConnected(targetNode) ? operation() : queueOperation(targetNode, operation);
      return reactiveElement;
    },

    onLoad: (callback: () => void) => {
      if (targetNode) {
        addLoadCallback(targetNode, callback);
      } else if (selector) {
        addPendingLoadCallback(selector, callback);
      }
      return reactiveElement;
    },

    get node() { return targetNode; }
  };

  return reactiveElement;
}