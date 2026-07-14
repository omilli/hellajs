import type { DomWrapper, HellaPrimitive, HellaProps, ElementHooks, DomRef } from "./types/nodes";
import type { DOMEventMap } from "./types/attributes";
import { createReactive } from "./internal/reactive";
import { multiSelectors, ensureRefObserver } from "./internal/selectors";
import { mountQueue, processMountQueue } from "./internal/queue";

/**
 * Creates a reactive reference to a single DOM element.
 * Operations queue automatically if element doesn't exist and apply when it appears.
 * Use $collection for multiple elements with continuous watching.
 *
 * @param selector CSS selector string
 * @returns SingleRef wrapper with bind/on/hooks/watch chainable methods
 */
export function $ref<T extends Element = Element>(selector: string): DomRef<T> {
  let targetNode = document.querySelector<T>(selector);
  let wrapper = targetNode ? createReactive(targetNode) : null;
  const queuedOps: Array<(wrapper: DomWrapper<T>) => void> = [];
  let isWatching = false;

  const applyOp = (op: (wrapper: DomWrapper<T>) => void) => {
    if (wrapper) {
      op(wrapper);
    } else {
      queuedOps.push(op);
    }
  };

  const startWatching = () => {
    if (isWatching || targetNode) return;
    isWatching = true;

    const processNode = (nodes: Element[]) => {
      if (nodes.length === 0) return;

      targetNode = nodes[0] as T;
      wrapper = createReactive(targetNode);

      let i = 0;
      const len = queuedOps.length;
      while (i < len)
        queuedOps[i++]!(wrapper);

      queuedOps.length = 0;

      // Trigger mount processing for afterMount hooks
      mountQueue.add(targetNode);
      processMountQueue();

      const entry = multiSelectors.get(selector);
      if (!entry) return;

      const index = entry.ops.indexOf(processNode);
      index !== -1 && entry.ops.splice(index, 1);

      entry.ops.length === 0 && multiSelectors.delete(selector);
    };

    const entry = multiSelectors.get(selector) || {
      ops: [],
      processedNodes: new WeakSet()
    };
    entry.ops.push(processNode);
    multiSelectors.set(selector, entry);
    ensureRefObserver();
  };

  const result = (() => targetNode) as DomRef<T>;

  result.bind = (value: HellaPrimitive | HellaProps) => {
    applyOp(w => w.bind(value));
    !targetNode && startWatching();
    return result;
  };

  result.on = <K extends keyof DOMEventMap>(event: K, handler: (this: T, event: DOMEventMap[K]) => void) => {
    applyOp(w => w.on(event, handler as EventListener));
    !targetNode && startWatching();
    return result;
  };

  result.hooks = (hooksObj: ElementHooks) => {
    applyOp(w => w.hooks(hooksObj));
    !targetNode && startWatching();
    return result;
  };

  Object.defineProperty(result, "node", {
    get: () => targetNode,
    enumerable: true
  });

  return result;
}
