import type { ReactiveElement, HellaPrimitive, HellaProps, HellaElement, ElementHooks, HookType, ElementFunction } from "../types/nodes.d.ts";
import type { DOMEventMap } from "../types/attributes.d.ts";
import { registry } from "../registry";
import { isFunction, isPlainObject, isString, objectLoop } from "./core";
import { renderProp, resolveText } from "./utils";
import { setNodeHandler } from "./events";

/**
 * Creates a reactive wrapper for a DOM element with bind, on, and hooks methods.
 * Shared between $ref (single) and $collection (multiple) APIs.
 */
export function reactive<T extends HellaElement>(element: T): ReactiveElement<T> {
  const wrapper: ReactiveElement<T> = {
    bind: (value: HellaPrimitive | HellaProps) => {
      if (isPlainObject(value)) {
        objectLoop(value as HellaProps, (key, val) => {
          const set = () => renderProp(element, key, resolveText(val));
          isFunction(val) ? registry.addEffect(element, set) : set();
        });
      } else {
        const prop = ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) ? 'value' : 'textContent';
        const set = () => element[prop] = resolveText(value);
        isFunction(value) ? registry.addEffect(element, set) : set();
      }
      return wrapper;
    },

    on: <K extends keyof DOMEventMap>(event: K, handler: (this: Element, event: DOMEventMap[K]) => void) => {
      setNodeHandler(element, event as string, handler as EventListener);
      return wrapper;
    },

    hooks: (hooksObj: ElementHooks) => {
      for (const type in hooksObj) {
        const fn = hooksObj[type as HookType];
        if (!fn) continue;
        registry.addHook(element, type as HookType, fn as (() => void) | ElementFunction);
        type === "afterMount" && element.__hella_mounted && (fn as ElementFunction)(element);
      }
      return wrapper;
    },

    get node() {
      return element;
    }
  };

  return wrapper;
}
