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

  // Create callable function using function expression (not arrow) to allow property assignment
  const result = function (index = 0): T | undefined {
    return elementWrappers[index]?.node ?? undefined;
  } as ReactiveRef<T>;

  // Define length as getter
  Object.defineProperty(result, 'length', {
    get: () => elementWrappers.length,
    enumerable: true
  });

  result.bind = (value: HellaPrimitive | HellaProps) => {
    applyAndQueue(w => w.bind(value));
    return result;
  };

  result.on = <K extends keyof DOMEventMap>(event: K, handler: (this: T, event: DOMEventMap[K]) => void) => {
    applyAndQueue(w => w.on(event, handler as EventListener));
    return result;
  };

  result.hooks = (hooksObj: ElementHooks) => {
    applyAndQueue(w => w.hooks(hooksObj));
    return result;
  };

  result.forEach = (callback: (element: ReactiveElement<T>, index: number) => void) => {
    applyAndQueue(callback);
    return result;
  };

  result.dispose = () => {
    unregisterMultiOp(selector, processNewNodes);
    queuedOps.length = 0;
  };

  // Copy array indices for bracket access
  let i = 0;
  while (i < elementWrappers.length) {
    (result as any)[i] = elementWrappers[i];
    i++;
  }

  return result;
}

/**
 * Creates a reactive element wrapper for a given DOM node.
 * @param targetNode - The DOM element to wrap
 * @returns Reactive element wrapper with bind(), on(), and lifecycle methods
 */
function reactiveElement<T extends Element>(targetNode: T): ReactiveElement<T> {
  const hellaElement = targetNode as HellaElement;

  const wrapper: ReactiveElement<T> = {
    bind: (value: HellaPrimitive | HellaProps) => {
      // Text binding - form elements use .value, others use .textContent
      if (typeof value === 'string' || isFunction(value)) {
        const isForm = FORM_TAGS.has(targetNode.tagName);
        const target = targetNode as unknown as Record<string, unknown>;
        const prop = isForm ? 'value' : 'textContent';

        isFunction(value)
          ? addRegistryEffect(hellaElement, () => target[prop] = normalizeTextValue(value()))
          : target[prop] = normalizeTextValue(value);
      }
      // Attribute binding with reactive support
      else {
        const attrs = value as HellaProps;
        for (const key in attrs) {
          const attrValue = attrs[key];
          isFunction(attrValue)
            ? addRegistryEffect(hellaElement, () => renderProp(targetNode, key, attrValue()))
            : renderProp(targetNode, key, attrValue);
        }
      }
      return wrapper;
    },

    on: <K extends keyof DOMEventMap>(event: K, handler: (this: Element, event: DOMEventMap[K]) => void) => {
      setNodeHandler(hellaElement, event as string, handler as EventListener);
      return wrapper;
    },

    hooks: (hooksObj: ElementHooks) => {
      for (const type in hooksObj) {
        const fn = hooksObj[type as HookType];
        if (!fn) continue;
        addHook(hellaElement, type as HookType, fn as (() => void) | ((node: Element) => void));
        // Call afterMount hook immediately if element is already mounted
        type === "afterMount" && hellaElement.__hella_mounted && (fn as (node: Element) => void)(hellaElement);
      }
      return wrapper;
    },

    get node() {
      return targetNode;
    }
  };

  return wrapper;
}