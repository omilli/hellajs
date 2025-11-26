import { addRegistryEffect, setNodeHandler, addHook, registerMultiOp, unregisterMultiOp, isFunction, renderProp, normalizeTextValue } from "./internal";
import type { ReactiveElement, ReactiveRef, HellaPrimitive, HellaProps, DOMEventMap, HellaElement, ElementHooks, HookType } from "./types";

/** Form element tag names for value property detection */
const FORM_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

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

  /** Applies operation to all wrappers and queues for future elements */
  const applyAndQueue = (op: (wrapper: ReactiveElement<T>, index: number) => void) => {
    let i = 0;
    while (i < elementWrappers.length) {
      op(elementWrappers[i], i);
      i++;
    }
    queuedOps.push(op);
  };

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
  registerMultiOp(selector, processNewNodes, initialNodes);

  const result: ReactiveRef<T> = Object.assign(elementWrappers, {
    text: (value: HellaPrimitive) => {
      applyAndQueue(w => w.text(value));
      return result;
    },

    attr: (attributes: HellaProps) => {
      applyAndQueue(w => w.attr(attributes));
      return result;
    },

    on: <K extends keyof DOMEventMap>(event: K, handler: (this: T, event: DOMEventMap[K]) => void) => {
      applyAndQueue(w => w.on(event, handler as EventListener));
      return result;
    },

    hooks: (hooksObj: ElementHooks) => {
      applyAndQueue(w => w.hooks(hooksObj));
      return result;
    },

    forEach: (callback: (element: ReactiveElement<T>, index: number) => void) => {
      applyAndQueue(callback);
      return result;
    },

    dispose: () => {
      unregisterMultiOp(selector, processNewNodes);
      queuedOps.length = 0;
    }
  });

  return result;
}

/**
 * Applies text content to a target node, handling form elements vs regular elements.
 * Form elements update .value property, others update .textContent.
 * @param targetNode The DOM element to update
 * @param hellaElement The Hella element wrapper for effect registration
 * @param value The text value (static or reactive)
 */
function applyText(targetNode: Element, hellaElement: HellaElement, value: HellaPrimitive) {
  const isForm = FORM_TAGS.has(targetNode.tagName);
  const target = targetNode as unknown as Record<string, unknown>;
  const prop = isForm ? 'value' : 'textContent';

  isFunction(value)
    ? addRegistryEffect(hellaElement, () => target[prop] = normalizeTextValue(value()))
    : target[prop] = normalizeTextValue(value);
}

/**
 * Applies attributes to a target node with reactive support.
 * @param targetNode The DOM element to update
 * @param hellaElement The Hella element wrapper for effect registration
 * @param attributes Key-value pairs of attributes to apply
 */
function applyAttrs(targetNode: Element, hellaElement: HellaElement, attributes: HellaProps) {
  for (const key in attributes) {
    const value = attributes[key];
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
  for (const type in hooksObj) {
    const fn = hooksObj[type as HookType];
    if (!fn) continue;
    addHook(hellaElement, type as HookType, fn);
    // Call mount hook immediately if element is already mounted
    if (type === "mount" && hellaElement.__hella_mounted) fn();
  }
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