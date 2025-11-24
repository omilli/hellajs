import { addRegistryEffect } from "./registry";
import { setNodeHandler } from "./events";
import { isFunction, renderProp, normalizeTextValue } from "./utils";
import type { ReactiveElement, ReactiveElements, HellaPrimitive, HellaProps, DOMEventMap, ElementLifecycle } from "./types";

/**
 * Selects a single DOM element and returns a reactive wrapper
 * @param selector - CSS selector string to find the element
 * @returns Reactive element wrapper with text(), attr(), and on() methods
 */
export function element<T extends Element = Element>(selector: string): ReactiveElement<T> {
  const targetNode = document.querySelector(selector) as T | null;
  !targetNode && console.warn(`${selector} not found`);
  return reactiveElement(targetNode);
}

/**
 * Selects multiple DOM elements and returns a reactive array wrapper
 * @param selector - CSS selector string to find the elements
 * @returns Reactive elements array with forEach() method and element wrappers
 */
export function elements<T extends Element = Element>(selector: string): ReactiveElements<T> {
  const nodes = document.querySelectorAll(selector) as NodeListOf<T>;
  nodes.length === 0 && console.warn(`${selector} not found`);
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
 * @returns Reactive element wrapper with text(), attr(), and on() methods
 */
export function reactiveElement<T extends Element>(targetNode: T | null): ReactiveElement<T> {
  if (!targetNode) return createEmptyWrapper<T>();

  const hellaElement = targetNode as unknown as import("./types").HellaElement;

  // Return cached wrapper if it exists
  if (hellaElement.__hella_wrapper) {
    return hellaElement.__hella_wrapper as ReactiveElement<T>;
  }

  const reactiveElement = {
    text: (value: HellaPrimitive): ReactiveElement<T> => {
      const tagName = targetNode.tagName?.toLowerCase();
      const isFormElement = tagName === 'input' || tagName === 'textarea' || tagName === 'select';

      const update = () => {
        const isMounted = hellaElement.__hella_mounted;
        const lifecycle = hellaElement.__hella_lifecycle;
        isMounted && lifecycle?.onBeforeUpdate?.();
        if (isFormElement && 'value' in targetNode) {
          (targetNode as any).value = normalizeTextValue(isFunction(value) ? value() : value);
        } else {
          targetNode.textContent = normalizeTextValue(isFunction(value) ? value() : value);
        }
        isMounted && lifecycle?.onUpdate?.();
      };

      if (isFormElement && 'value' in targetNode) {
        const formElement = targetNode;
        isFunction(value) ?
          addRegistryEffect(targetNode, () => {
            const isMounted = hellaElement.__hella_mounted;
            const lifecycle = hellaElement.__hella_lifecycle;
            isMounted && lifecycle?.onBeforeUpdate?.();
            formElement.value = normalizeTextValue(value());
            isMounted && lifecycle?.onUpdate?.();
          })
          : update();
      } else {
        isFunction(value) ?
          addRegistryEffect(targetNode, () => {
            const isMounted = hellaElement.__hella_mounted;
            const lifecycle = hellaElement.__hella_lifecycle;
            isMounted && lifecycle?.onBeforeUpdate?.();
            targetNode.textContent = normalizeTextValue(value());
            isMounted && lifecycle?.onUpdate?.();
          })
          : update();
      }

      return reactiveElement;
    },

    attr: (attributes: HellaProps): ReactiveElement<T> => {
      const attrs = Object.entries(attributes);

      for (const [key, value] of attrs) {
        isFunction(value) ?
          addRegistryEffect(targetNode, () => {
            const isMounted = hellaElement.__hella_mounted;
            const lifecycle = hellaElement.__hella_lifecycle;
            isMounted && lifecycle?.onBeforeUpdate?.();
            renderProp(targetNode, key, value());
            isMounted && lifecycle?.onUpdate?.();
          })
          : (() => {
            const isMounted = hellaElement.__hella_mounted;
            const lifecycle = hellaElement.__hella_lifecycle;
            isMounted && lifecycle?.onBeforeUpdate?.();
            renderProp(targetNode, key, value);
            isMounted && lifecycle?.onUpdate?.();
          })();
      }

      return reactiveElement;
    },

    on: <K extends keyof DOMEventMap>(event: K, handler: (this: Element, event: DOMEventMap[K]) => void): ReactiveElement<T> => {
      setNodeHandler(targetNode, event, handler as EventListener);
      return reactiveElement;
    },

    lifecycle: ((hooks?: Partial<ElementLifecycle>) => {
      if (hooks === undefined) {
        return hellaElement.__hella_lifecycle;
      }

      if (!hellaElement.__hella_lifecycle) {
        hellaElement.__hella_lifecycle = {};
      }

      Object.assign(hellaElement.__hella_lifecycle, hooks);
      return reactiveElement;
    }) as {
      (hooks: Partial<ElementLifecycle>): ReactiveElement<T>;
      (): ElementLifecycle | undefined;
    },

    get effects(): Set<() => void> | undefined { return hellaElement.__hella_effects; },
    get handlers(): Record<string, EventListener> | undefined { return hellaElement.__hella_handlers; },
    get mounted(): boolean { return !!hellaElement.__hella_mounted; },
    get node(): T | null { return targetNode; }
  } as ReactiveElement<T>;

  // Cache the wrapper on the element
  hellaElement.__hella_wrapper = reactiveElement;

  return reactiveElement;
}

/**
 * Creates an empty wrapper for null elements
 */
function createEmptyWrapper<T extends Element>(): ReactiveElement<T> {
  const noop = (): ReactiveElement<T> => emptyWrapper;
  const emptyWrapper = {
    text: noop,
    attr: noop,
    on: <K extends keyof DOMEventMap>(_event: K, _handler: (this: Element, event: DOMEventMap[K]) => void): ReactiveElement<T> => emptyWrapper,
    lifecycle: ((hooks?: Partial<ElementLifecycle>) => {
      return hooks === undefined ? undefined : emptyWrapper;
    }) as {
      (hooks: Partial<ElementLifecycle>): ReactiveElement<T>;
      (): ElementLifecycle | undefined;
    },
    get effects(): Set<() => void> | undefined { return undefined; },
    get handlers(): Record<string, EventListener> | undefined { return undefined; },
    get mounted(): boolean { return false; },
    get node(): T | null { return null; }
  } as ReactiveElement<T>;
  return emptyWrapper;
}