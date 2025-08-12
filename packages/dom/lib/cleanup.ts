import type { HellaElement } from "./types";
import { DOC } from "./utils";

const EFFECTS = "hellaEffects";
const EVENTS = "hellaEvents";

/**
 * Adds a cleanup function to an element, to be run when the element is removed from the DOM.
 * @param element The DOM element.
 * @param effectFn The cleanup function to add.
 */
export function addElementEffect(element: HellaElement, effectFn: () => void) {
  element[EFFECTS] ??= new Set();
  element[EFFECTS].add(effectFn);
}

/**
 * Associates an event listener with an element for delegated handling.
 * @param element The DOM element.
 * @param type The event type.
 * @param handler The event listener.
 */
export function addElementEvent(element: HellaElement, type: string, handler: EventListener) {
  element[EVENTS] ??= new Map();
  element[EVENTS].set(type, handler);
}

/**
 * Retrieves the map of event listeners for an element.
 * @param element The DOM element.
 * @returns The map of event listeners.
 */
export function getElementEvents(element: HellaElement): Map<string, EventListener> | undefined {
  return element[EVENTS];
}

/**
 * Runs all cleanup functions for an element.
 * @param element The DOM element to clean.
 */
function cleanElementEffects(element: HellaElement) {
  const effects = element[EFFECTS];
  if (effects) {
    effects.forEach((fn: () => void) => fn());
    effects.clear();
    delete element[EFFECTS];
  }
}

/**
 * Clears all event listeners for an element.
 * @param element The DOM element.
 */
function cleanElementEvents(element: HellaElement) {
  if (element[EVENTS]) {
    element[EVENTS].clear();
    delete element[EVENTS];
  }
}

/**
 * Cleans an element by running its effects, clearing events, and calling onDestroy.
 * @param element The DOM element to clean.
 */
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
