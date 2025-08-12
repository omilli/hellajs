import type { HellaElement } from "./types";
import { DOC } from "./utils";

const EFFECTS = "hellaEffects";
const EVENTS = "hellaEvents";

export function addElementEffect(element: HellaElement, effectFn: () => void) {
  element[EFFECTS] ??= new Set();
  element[EFFECTS].add(effectFn);
}

export function addElementEvent(element: HellaElement, type: string, handler: EventListener) {
  element[EVENTS] ??= new Map();
  element[EVENTS].set(type, handler);
}

export function getElementEvents(element: HellaElement): Map<string, EventListener> | undefined {
  return element[EVENTS];
}

function cleanElementEffects(element: HellaElement) {
  const effects = element[EFFECTS];
  if (effects) {
    effects.forEach((fn: () => void) => fn());
    effects.clear();
    delete element[EFFECTS];
  }
}

function cleanElementEvents(element: HellaElement) {
  if (element[EVENTS]) {
    element[EVENTS].clear();
    delete element[EVENTS];
  }
}

function cleanElement(element: HellaElement) {
  cleanElementEffects(element);
  cleanElementEvents(element);
  element.onDestroy?.();
}

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.removedNodes.forEach(element => {
      if (element.nodeType === Node.ELEMENT_NODE) {
        queueMicrotask(() => {
          if (!DOC.contains(element)) {
            cleanElement(element as Element);
            (element as Element).querySelectorAll('*').forEach(descendant =>
              cleanElement(descendant)
            );
          }
        });
      }
    });
  });
});

observer.observe(DOC.body, {
  childList: true,
  subtree: true
});
