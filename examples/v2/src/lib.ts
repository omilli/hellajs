import { effect } from "@hellajs/core";

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

const parser = new DOMParser();

const morph = (() => {
  const indexTree = (node: Node, lookup: Record<string, Element>) => {
    if (node.nodeType !== ELEMENT_NODE) return;

    let child = node.firstChild;
    while (child) {
      if (child.nodeType === ELEMENT_NODE) {
        const key = (child as Element).getAttribute('data-key');
        if (key) lookup[key] = child as Element;
        indexTree(child, lookup);
      }
      child = child.nextSibling;
    }
  };

  const morphChildren = (fromEl: Element, toEl: Element, lookup: Record<string, Element>, keyedToRemove: string[], shouldUpdate?: (from: Element, to: Element) => boolean) => {
    let curTo = toEl.firstChild;
    let curFrom = fromEl.firstChild;

    // Fast path: fromEl is empty, blast in new content
    if (!curFrom) {
      if (!curTo) return;
      fromEl.innerHTML = toEl.innerHTML;
      return;
    }

    // Fast path: toEl is empty, remove all children
    if (!curTo) {
      while (curFrom) {
        const next: ChildNode | null = curFrom.nextSibling;
        fromEl.removeChild(curFrom);
        curFrom = next;
      }
      return;
    }

    let toNext: ChildNode | null;
    let fromNext: ChildNode | null;

    outer: while (curTo) {
      toNext = curTo.nextSibling;

      while (curFrom) {
        fromNext = curFrom.nextSibling;

        if (curTo.nodeType === curFrom.nodeType) {
          let compatible = false;

          if (curTo.nodeType === ELEMENT_NODE) {
            const toElem = curTo as Element;
            const fromElem = curFrom as Element;
            const toKey = toElem.getAttribute('data-key');
            const fromKey = fromElem.getAttribute('data-key');

            if (toKey) {
              if (toKey === fromKey) {
                const skip = shouldUpdate ? !shouldUpdate(fromElem, toElem) : false;
                if (!skip) {
                  morphAttrs(fromElem, toElem);
                  morphChildren(fromElem, toElem, lookup, keyedToRemove, shouldUpdate);
                }
                delete lookup[toKey];
                compatible = true;
              } else {
                const match = lookup[toKey];
                if (match && match.nodeName === toElem.nodeName) {
                  if (fromNext === match) {
                    // Special case: skip this node, match will be found next iteration
                    compatible = false;
                  } else {
                    fromEl.insertBefore(match, curFrom);
                    morphAttrs(match, toElem);
                    morphChildren(match, toElem, lookup, keyedToRemove, shouldUpdate);
                    delete lookup[toKey];

                    // Defer removal of displaced keyed node
                    if (fromKey) keyedToRemove.push(fromKey);
                    else fromEl.removeChild(curFrom);

                    curFrom = match;
                    compatible = true;
                  }
                }
              }
            } else if (!fromKey && fromElem.nodeName === toElem.nodeName) {
              morphAttrs(fromElem, toElem);
              morphChildren(fromElem, toElem, lookup, keyedToRemove, shouldUpdate);
              compatible = true;
            }
          } else if (curTo.nodeType === TEXT_NODE) {
            if (curFrom.nodeValue !== curTo.nodeValue) curFrom.nodeValue = curTo.nodeValue;
            compatible = true;
          }

          if (compatible) {
            curTo = toNext;
            curFrom = fromNext;
            continue outer;
          }
        }

        // Defer keyed node removal, remove non-keyed immediately
        const fromKey = curFrom.nodeType === ELEMENT_NODE ? (curFrom as Element).getAttribute('data-key') : null;
        if (fromKey) {
          keyedToRemove.push(fromKey);
        } else {
          fromEl.removeChild(curFrom);
        }
        curFrom = fromNext;
      }

      const toKey = curTo.nodeType === ELEMENT_NODE ? (curTo as Element).getAttribute('data-key') : null;
      if (toKey && lookup[toKey]) {
        const match = lookup[toKey]!;
        fromEl.appendChild(match);
        morphAttrs(match, curTo as Element);
        morphChildren(match, curTo as Element, lookup, keyedToRemove, shouldUpdate);
        delete lookup[toKey];
      } else {
        fromEl.appendChild(curTo.cloneNode(true));
      }

      curTo = toNext;
    }

    // Remove remaining non-keyed nodes, defer keyed
    while (curFrom) {
      fromNext = curFrom.nextSibling;
      const fromKey = curFrom.nodeType === ELEMENT_NODE ? (curFrom as Element).getAttribute('data-key') : null;
      if (fromKey) {
        keyedToRemove.push(fromKey);
      } else {
        fromEl.removeChild(curFrom);
      }
      curFrom = fromNext;
    }
  };

  return (fromEl: Element, toEl: Element, prevLookup: Record<string, Element>, shouldUpdate?: (from: Element, to: Element) => boolean) => {
    const lookup = prevLookup;
    const keyedToRemove: string[] = [];
    indexTree(fromEl, lookup);
    morphChildren(fromEl, toEl, lookup, keyedToRemove, shouldUpdate);

    // Remove deferred keyed nodes
    let i = 0;
    while (i < keyedToRemove.length) {
      const key = keyedToRemove[i++]!;
      const el = lookup[key];
      if (el?.parentNode) el.parentNode.removeChild(el);
      delete lookup[key];
    }

    return lookup;
  };
})();

const morphAttrs = (from: Element, to: Element) => {
  const toAttrs = to.attributes;
  let i = toAttrs.length;

  while (i--) {
    const attr = toAttrs[i]!;
    const name = attr.name;
    const value = attr.value;
    if (from.getAttribute(name) !== value) {
      from.setAttribute(name, value);
    }
  }

  const fromAttrs = from.attributes;
  i = fromAttrs.length;

  while (i--) {
    const name = fromAttrs[i]!.name;
    if (!to.hasAttribute(name)) {
      from.removeAttribute(name);
    }
  }
};

const mount = (templateFn: () => string, mountID?: string) => {
  mountID ??= 'app';
  const app = document.getElementById(mountID)!;
  let lookup: Record<string, Element> = {};

  return effect(() => {
    const template = templateFn();

    if (app.childNodes.length === 0) {
      app.innerHTML = template;
    } else {
      const doc = parser.parseFromString(`<div id="${mountID}">${template}</div>`, 'text/html');
      const newApp = doc.body.firstChild as Element;

      lookup = morph(app, newApp, lookup, (from, to) => {
        const fromKey = from.getAttribute('data-key');
        const toKey = to.getAttribute('data-key');
        return fromKey && toKey && fromKey === toKey ? !from.isEqualNode(to) : true;
      });
    }
  });
};

// Smart event handler extraction and delegation system
const handlers = new Map<string, Function>();
const handlerIds = new WeakMap<Function, string>();
const delegated = new Set<string>();
let handlerCounter = 0;


const getHandlerId = (fn: Function): string => {
  let id = handlerIds.get(fn);
  if (!id) {
    id = `h${handlerCounter++}`;
    handlerIds.set(fn, id);
  }
  return id;
};

const ensureDelegation = (eventType: string) => {
  if (delegated.has(eventType)) return;

  delegated.add(eventType);
  document.addEventListener(eventType.toLowerCase(), (e: Event) => {
    let target = e.target as Element | null;

    while (target && target !== document.documentElement) {
      const handlerId = target.getAttribute(`on:${eventType.toLowerCase()}`);
      if (handlerId) {
        const handler = handlers.get(handlerId);
        if (handler) {
          handler(target, e);
          break;
        }
      }
      target = target.parentElement;
    }
  }, false);
};

// Global handler tracking across all template calls
const globalHandlers: Function[] = [];

export const html = (strings: TemplateStringsArray, ...values: any[]) => {
  // First pass: replace function values with unique placeholders
  let result = strings[0]!;
  let i = 0;
  while (i < values.length) {
    const value = values[i];
    if (typeof value === 'function') {
      const idx = globalHandlers.length;
      globalHandlers.push(value);
      result += `\${__HANDLER_FN_${idx}__}`;
    } else {
      result += value ?? '';
    }
    result += strings[i + 1];
    i++;
  }

  // Second pass: find event attributes with handler placeholders and register
  result = result.replace(/\son([A-Z][a-zA-Z]+)="\$\{__HANDLER_FN_(\d+)__\}"/g, (match, eventName, handlerIdx) => {
    const handler = globalHandlers[Number(handlerIdx)];
    if (!handler) return match;

    const handlerId = getHandlerId(handler);
    handlers.set(handlerId, handler);
    ensureDelegation(eventName);

    return ` on:${eventName.toLowerCase()}="${handlerId}"`;
  });

  return result;
};


// Smart event delegation system
type EventHandler<T extends Element = Element, E extends Event = Event> = (el: T, e: E) => void;

interface OnOptions<T extends Element = Element, E extends Event = Event> {
  event: string;
  target: string;
  handler: EventHandler<T, E>;
  delegate?: string;
  root?: Element | Document;
  capture?: boolean;
  once?: boolean;
}

// Track cleanups and effects by element
const CLEANUPS_KEY = '__hella_cleanups';
const EFFECTS_KEY = '__hella_effects';
const cleanupQueue = new Set<Element>();
let cleanupScheduled = false;

const cleanNode = (node: Node) => {
  const el = node as any;

  // Dispose effects
  const effects = el[EFFECTS_KEY];
  if (effects) {
    let i = 0;
    while (i < effects.length) {
      effects[i++]();
    }
    delete el[EFFECTS_KEY];
  }

  // Run delegate cleanups
  const cleanups = el[CLEANUPS_KEY];
  if (cleanups) {
    let j = 0;
    while (j < cleanups.length) {
      cleanups[j++]();
    }
    delete el[CLEANUPS_KEY];
  }
};

const cleanWithDescendants = (node: Node) => {
  cleanNode(node);

  if (node.nodeType === 1 && node.hasChildNodes()) {
    const children = node.childNodes;
    let i = 0;
    while (i < children.length) {
      cleanWithDescendants(children[i++]);
    }
  }
};

const processCleanupQueue = () => {
  cleanupScheduled = false;
  const elements = Array.from(cleanupQueue);
  cleanupQueue.clear();

  let i = 0;
  while (i < elements.length) {
    const el = elements[i++];
    if (el.isConnected) continue;
    cleanWithDescendants(el);
  }
};

const observer = new MutationObserver((mutations) => {
  let i = 0;
  while (i < mutations.length) {
    const removed = mutations[i++].removedNodes;
    let j = 0;
    while (j < removed.length) {
      const node = removed[j++];
      if (node.nodeType === 1) {
        cleanupQueue.add(node as Element);
      }
    }
  }

  if (cleanupQueue.size > 0 && !cleanupScheduled) {
    cleanupScheduled = true;
    setTimeout(processCleanupQueue, 0);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

const on = <T extends Element = Element, E extends Event = Event>(
  options: OnOptions<T, E>
) => {
  const { event, target, handler, delegate, root = document, capture = false, once = false } = options;

  const listener = (e: Event) => {
    const el = (e.target as Element).closest(target);
    if (el) {
      handler(el as T, e as E);
      if (once) root.removeEventListener(event, listener, capture);
    }
  };

  root.addEventListener(event, listener, capture);

  const cleanup = () => root.removeEventListener(event, listener, capture);

  if (delegate) {
    const el = typeof delegate === 'string' ? document.querySelector(delegate) : delegate;
    if (el) {
      (el as any)[CLEANUPS_KEY] = (el as any)[CLEANUPS_KEY] || [];
      (el as any)[CLEANUPS_KEY].push(cleanup);
    }
  }

  return cleanup;
};

const forEach = <T>(arr: T[], fn: (item: T, index: number) => string) => {
  let result = '';
  let i = 0;
  const len = arr.length;
  while (i < len) {
    result += fn(arr[i]!, i);
    i++;
  }
  return result;
};

export { on, mount, forEach };
export type { EventHandler, OnOptions };