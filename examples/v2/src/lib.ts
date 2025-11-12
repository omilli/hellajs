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
      const el = lookup[keyedToRemove[i]!];
      if (el?.parentNode) el.parentNode.removeChild(el);
      i++;
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

const mount = (template: () => string) => {
  const app = document.getElementById('app')!;
  let lookup: Record<string, Element> = {};

  return effect(() => {
    const html = template();

    if (app.childNodes.length === 0) {
      app.innerHTML = html;
    } else {
      const doc = parser.parseFromString(`<div id="app">${html}</div>`, 'text/html');
      const newApp = doc.body.firstChild as Element;

      lookup = morph(app, newApp, lookup, (from, to) => {
        const fromKey = from.getAttribute('data-key');
        const toKey = to.getAttribute('data-key');
        return fromKey && toKey && fromKey === toKey ? !from.isEqualNode(to) : true;
      });
    }
  });
};

export const html = (strings: TemplateStringsArray, ...values: any[]) =>
  strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');


// Smart event delegation system
type EventHandler<T extends Element = Element, E extends Event = Event> = (el: T, e: E) => void;

interface DelegateOptions {
  root?: Element | Document;
  capture?: boolean;
  once?: boolean;
}

const on = <T extends Element = Element, E extends Event = Event>(
  events: string | string[],
  selector: string,
  handler: EventHandler<T, E>,
  options: DelegateOptions = {}
) => {
  const { root = document, capture = false, once = false } = options;
  const eventList = typeof events === 'string' ? events.split(' ') : events;
  const cleanups: (() => void)[] = [];

  let i = 0;
  while (i < eventList.length) {
    const eventType = eventList[i]!;

    const listener = (e: Event) => {
      const target = (e.target as Element).closest(selector);
      if (target) {
        handler(target as T, e as E);
        if (once) root.removeEventListener(eventType, listener, capture);
      }
    };

    root.addEventListener(eventType, listener, capture);
    cleanups.push(() => root.removeEventListener(eventType, listener, capture));
    i++;
  }

  return () => {
    let j = 0;
    while (j < cleanups.length) {
      cleanups[j]!();
      j++;
    }
  };
};

export { on, mount };
export type { EventHandler, DelegateOptions };