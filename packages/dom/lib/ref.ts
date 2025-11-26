import { addRegistryEffect, setNodeHandler, addHook, registerMultiPendingOp, unregisterMultiPendingOp, isFunction, renderProp, normalizeTextValue, objectLoop } from "./internal";
import type { ReactiveElement, ReactiveRef, HellaPrimitive, HellaProps, DOMEventMap, HellaElement, ElementHooks, HookType } from "./types";

/**
 * Applies text content to a target node, handling form elements vs regular elements.
 * Form elements update .value property, others update .textContent.
 * @param targetNode The DOM element to update
 * @param hellaElement The Hella element wrapper for effect registration
 * @param value The text value (static or reactive)
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
 * Applies attributes to a target node with reactive support.
 * @param targetNode The DOM element to update
 * @param hellaElement The Hella element wrapper for effect registration
 * @param attributes Key-value pairs of attributes to apply
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
 * Applies event handler to a target node using global delegation.
 * @param hellaElement The Hella element wrapper
 * @param event The event type (e.g., 'click', 'input')
 * @param handler The event handler function
 */
function applyEvent(hellaElement: HellaElement, event: string, handler: EventListener) {
  setNodeHandler(hellaElement, event, handler);
}

/**
 * Applies lifecycle hooks to a target node.
 * @param hellaElement The Hella element wrapper
 * @param hooksObj Object containing lifecycle hook callbacks
 */
function applyHooks(hellaElement: HellaElement, hooksObj: ElementHooks) {
  objectLoop(hooksObj as Record<string, unknown>, (type, fn) => {
    addHook(hellaElement, type as HookType, fn as () => void);
    // Call mount hook immediately if element is already mounted
    type === "mount" && hellaElement.__hella_mounted && (fn as () => void)();
  });
}

/**
 * Creates a reactive element wrapper for a given DOM node.
 * @param targetNode - The DOM element to wrap
 * @returns Reactive element wrapper with text(), attr(), on(), and lifecycle methods
 */
function reactiveElement<T extends Element>(targetNode: T): ReactiveElement<T> {
  const hellaElement = targetNode as HellaElement;

  const wrapper: ReactiveElement<T> = {
    text: (value: HellaPrimitive) => {
      applyText(targetNode, hellaElement, value);
      return wrapper;
    },

    attr: (attributes: HellaProps) => {
      applyAttrs(targetNode, hellaElement, attributes);
      return wrapper;
    },

    on: <K extends keyof DOMEventMap>(event: K, handler: (this: Element, event: DOMEventMap[K]) => void) => {
      applyEvent(hellaElement, event as string, handler as EventListener);
      return wrapper;
    },

    hooks: (hooksObj: ElementHooks) => {
      applyHooks(hellaElement, hooksObj);
      return wrapper;
    },

    get node() {
      return targetNode;
    }
  };

  return wrapper;
}

/**
 * Reactive reference to DOM elements with automatic watching.
 * Uses querySelectorAll internally - operations apply to all matched elements.
 * Watches for new elements matching selector and applies queued operations.
 * @param selector - CSS selector string to find elements
 * @returns Reactive reference with declarative methods and forEach for imperative access
 */
export function $ref<T extends Element = Element>(selector: string): ReactiveRef<T> {
  const elementWrappers: ReactiveElement<T>[] = [];
  const queuedOps: Array<(wrapper: ReactiveElement<T>, index: number) => void> = [];

  // Process new nodes: create wrappers and apply queued operations
  const processNewNodes = (nodes: Element[]) => {
    let i = 0;
    while (i < nodes.length) {
      const wrapper = reactiveElement(nodes[i] as T);
      const index = elementWrappers.length;
      elementWrappers.push(wrapper);

      // Apply all queued operations to this new wrapper
      let j = 0;
      while (j < queuedOps.length) {
        queuedOps[j](wrapper, index);
        j++;
      }
      i++;
    }
  };

  // Initial query for existing elements
  const initialNodes = Array.from(document.querySelectorAll(selector) as NodeListOf<T>);
  processNewNodes(initialNodes);

  // Register for future elements - pass initialNodes to prevent duplicates
  const multiPendingOp = (newNodes: Element[]) => {
    processNewNodes(newNodes);
  };
  registerMultiPendingOp(selector, multiPendingOp, initialNodes);

  const result: ReactiveRef<T> = Object.assign(elementWrappers, {
    text: (value: HellaPrimitive) => {
      const applyText = (wrapper: ReactiveElement<T>) => {
        wrapper.text(value);
      };

      // Apply to existing elements
      let i = 0;
      while (i < elementWrappers.length) {
        applyText(elementWrappers[i]);
        i++;
      }

      // Queue for future elements
      queuedOps.push(applyText);
      return result;
    },

    attr: (attributes: HellaProps) => {
      const applyAttrs = (wrapper: ReactiveElement<T>) => {
        wrapper.attr(attributes);
      };

      let i = 0;
      while (i < elementWrappers.length) {
        applyAttrs(elementWrappers[i]);
        i++;
      }

      queuedOps.push(applyAttrs);
      return result;
    },

    on: <K extends keyof DOMEventMap>(event: K, handler: (this: T, event: DOMEventMap[K]) => void) => {
      const applyEvent = (wrapper: ReactiveElement<T>) => {
        wrapper.on(event, handler as EventListener);
      };

      let i = 0;
      while (i < elementWrappers.length) {
        applyEvent(elementWrappers[i]);
        i++;
      }

      queuedOps.push(applyEvent);
      return result;
    },

    hooks: (hooksObj: ElementHooks) => {
      const applyHooks = (wrapper: ReactiveElement<T>) => {
        wrapper.hooks(hooksObj);
      };

      let i = 0;
      while (i < elementWrappers.length) {
        applyHooks(elementWrappers[i]);
        i++;
      }

      queuedOps.push(applyHooks);
      return result;
    },

    forEach: (callback: (element: ReactiveElement<T>, index: number) => void) => {
      // Apply to existing elements
      let i = 0;
      while (i < elementWrappers.length) {
        callback(elementWrappers[i], i);
        i++;
      }

      // Queue for future elements
      queuedOps.push(callback);
      return result;
    },

    dispose: () => {
      // Unregister from multi-pending system
      unregisterMultiPendingOp(selector, multiPendingOp);
      // Clear queued operations
      queuedOps.length = 0;
    }
  });

  return result;
}