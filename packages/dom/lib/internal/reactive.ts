import type { DomWrapper, HellaPrimitive, HellaProps, HellaElement, ElementHooks, HookType, ElementMountFn } from "../types/nodes";
import type { DOMEventMap } from "../types/attributes";
import { registry } from "../registry";
import { isFunction, isPlainObject, objectLoop } from "./core";
import { renderProp, resolveText } from "./utils";
import { setNodeHandler } from "./events";

const FORM_ELEMENTS = Object.freeze(new Set(["INPUT", "TEXTAREA", "SELECT"]));

/**
 * @internal
 * Creates a reactive wrapper for a DOM element with bind, on, and hooks methods.
 * Shared between $ref (single) and $collection (multiple) APIs.
 */
export function createReactive<T extends HellaElement>(element: T): DomWrapper<T> {
  const wrapper: DomWrapper<T> = {
    bind: (value: HellaPrimitive | HellaProps) => {
      if (isPlainObject(value)) {
        objectLoop(value as HellaProps, (key, val) => {
          const set = () => renderProp(element, key, resolveText(val));
          isFunction(val) ? registry.addEffect(element, set) : set();
        });
      } else {
        const prop = FORM_ELEMENTS.has(element.tagName) ? "value" : "textContent";
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
      const hookKeys = Object.keys(hooksObj);
      let hi = 0;
      const hLen = hookKeys.length;
      while (hi < hLen) {
        const type = hookKeys[hi++]! as HookType;
        const fn = hooksObj[type];
        if (!fn) continue;
        registry.addHook(element, type, fn as (() => void) | ElementMountFn);
      }
      return wrapper;
    },

    get node() {
      return element;
    }
  };

  return wrapper;
}
