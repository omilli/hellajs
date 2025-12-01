import type { ReactiveElement, HellaPrimitive, HellaProps, ElementHooks } from "./types/nodes";
import type { DOMEventMap } from "./types/attributes";
import { reactive } from "./internal/reactive";

/**
 * Single element reference result type.
 * Lighter than ReactiveRef - no forEach, no dispose, no collection tracking.
 */
export interface SingleRef<T extends Element = Element> extends ReactiveElement<T> {
  /** Get raw DOM node */
  (): T | null;
}

/**
 * Creates a reactive reference to a single DOM element.
 * Use $collection for multiple elements with auto-watching.
 * 
 * @param selector CSS selector string
 * @returns SingleRef wrapper with bind/on/hooks chainable methods
 */
export function $ref<T extends Element = Element>(selector: string): SingleRef<T> {
  const targetNode = document.querySelector<T>(selector);
  const wrapper = targetNode ? reactive(targetNode) : null;

  const result = (() => targetNode) as SingleRef<T>;

  result.bind = (value: HellaPrimitive | HellaProps) => {
    wrapper?.bind(value);
    return result;
  };

  result.on = <K extends keyof DOMEventMap>(event: K, handler: (this: T, event: DOMEventMap[K]) => void) => {
    wrapper?.on(event, handler as EventListener);
    return result;
  };

  result.hooks = (hooksObj: ElementHooks) => {
    wrapper?.hooks(hooksObj);
    return result;
  };

  Object.defineProperty(result, 'node', {
    get: () => targetNode,
    enumerable: true
  });

  return result;
}
