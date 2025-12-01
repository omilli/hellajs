import type { ReactiveElement, HellaPrimitive, HellaProps, HellaElement, ElementHooks, HookType } from "../types/nodes";
import type { DOMEventMap } from "../types/attributes";
import { registry } from "../registry";
import { isFunction, renderProp, normalizeTextValue } from "./utils";
import { setNodeHandler } from "./events";

const FORM_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Creates a reactive wrapper for a DOM element with bind, on, and hooks methods.
 * Shared between $ref (single) and $collection (multiple) APIs.
 */
export function reactive<T extends Element>(targetNode: T): ReactiveElement<T> {
  const hellaElement = targetNode as HellaElement;

  const wrapper: ReactiveElement<T> = {
    bind: (value: HellaPrimitive | HellaProps) => {
      if (typeof value === 'string' || isFunction(value)) {
        const isForm = FORM_TAGS.has(targetNode.tagName);
        const target = targetNode as unknown as Record<string, unknown>;
        const prop = isForm ? 'value' : 'textContent';

        isFunction(value)
          ? registry.addEffect(hellaElement, () => target[prop] = normalizeTextValue(value()))
          : target[prop] = normalizeTextValue(value);
      } else {
        const attrs = value as HellaProps;
        for (const key in attrs) {
          const attrValue = attrs[key];
          isFunction(attrValue)
            ? registry.addEffect(hellaElement, () => renderProp(targetNode, key, attrValue()))
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
        registry.addHook(hellaElement, type as HookType, fn as (() => void) | ((node: Element) => void));
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
