import { DOC } from "./utils";

const EFFECTS_KEY = Symbol("hellajs-effects");
const EVENTS_KEY = Symbol("hellajs-events");

export function addElementEffect(node: Node, effectFn: () => void) {
  const element = node as any;
  if (!element[EFFECTS_KEY]) {
    element[EFFECTS_KEY] = new Set();
  }
  element[EFFECTS_KEY].add(effectFn);
}

export function addElementEvent(node: Node, type: string, handler: EventListener) {
  const element = node as any;
  if (!element[EVENTS_KEY]) {
    element[EVENTS_KEY] = new Map();
  }
  element[EVENTS_KEY].set(type, handler);
}

export function getElementEvents(node: Node): Map<string, EventListener> | undefined {
  return (node as any)[EVENTS_KEY];
}

function cleanElementEffects(node: Node) {
  const element = node as any;
  const effects = element[EFFECTS_KEY];
  if (effects) {
    effects.forEach((fn: () => void) => fn());
    effects.clear();
    delete element[EFFECTS_KEY];
  }
}

function cleanElementEvents(node: Node) {
  const element = node as any;
  if (element[EVENTS_KEY]) {
    element[EVENTS_KEY].clear();
    delete element[EVENTS_KEY];
  }
}

function cleanElement(node: Node) {
  cleanElementEffects(node);
  cleanElementEvents(node);
  (node as any).onDestroy?.();
}

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.removedNodes.forEach(removedNode => {
      if (removedNode.nodeType === Node.ELEMENT_NODE) {
        queueMicrotask(() => {
          if (!DOC.contains(removedNode)) {
            const element = removedNode as Element;
            cleanElement(element);
            element.querySelectorAll('*').forEach(descendant =>
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
