import { createReactive } from "./internal/reactive";
import { registerMultiOp, unregisterMultiOp } from "./internal/selectors";
import type { DomWrapper, DomCollection, HellaPrimitive, HellaProps, ElementHooks } from "./types/nodes";
import type { DOMEventMap } from "./types/attributes";

/**
 * Creates a reactive reference to multiple DOM elements with auto-watching.
 * Automatically applies operations to newly added elements matching the selector.
 * Use $ref for single element references without collection overhead.
 * 
 * @param selector CSS selector string
 * @returns DomCollection with bind/on/hooks/forEach chainable methods
 */
export function $collection<T extends Element = Element>(selector: string): DomCollection<T> {
  const elementWrappers: DomWrapper<T>[] = [];
  const queuedOps: Array<(wrapper: DomWrapper<T>, index: number) => void> = [];

  const applyAndQueue = (op: (wrapper: DomWrapper<T>, index: number) => void) => {
    let i = 0;
    const len = elementWrappers.length;
    while (i < len) {
      op(elementWrappers[i]!, i);
      i++;
    }
    queuedOps.push(op);
  };

  const processNewNodes = (nodes: Element[]) => {
    let i = 0;
    const len = nodes.length;
    while (i < len) {
      const wrapper = createReactive(nodes[i] as T);
      const index = elementWrappers.length;
      elementWrappers.push(wrapper);

      let oi = 0;
      const oLen = queuedOps.length;
      while (oi < oLen) {
        queuedOps[oi]!(wrapper, index);
        oi++;
      }
      i++;
    }
  };

  const initialNodes = Array.from(document.querySelectorAll(selector) as NodeListOf<T>);
  processNewNodes(initialNodes);

  registerMultiOp(selector, processNewNodes, initialNodes);

  const result = function (index = 0): T | undefined {
    return elementWrappers[index]?.node ?? undefined;
  } as DomCollection<T>;

  Object.defineProperty(result, "length", {
    get: () => elementWrappers.length,
    enumerable: true
  });

  result.bind = (value: HellaPrimitive | HellaProps) => {
    applyAndQueue(w => w.bind(value));
    return result;
  };

  result.on = <K extends keyof DOMEventMap>(event: K, handler: (this: T, event: DOMEventMap[K]) => void) => {
    applyAndQueue(w => w.on(event, handler as EventListener));
    return result;
  };

  result.hooks = (hooksObj: ElementHooks) => {
    applyAndQueue(w => w.hooks(hooksObj));
    return result;
  };

  result.forEach = (callback: (element: DomWrapper<T>, index: number) => void) => {
    applyAndQueue(callback);
    return result;
  };

  result.dispose = () => {
    unregisterMultiOp(selector, processNewNodes);
    queuedOps.length = 0;
  };

  let i = 0;
  const len = elementWrappers.length;
  while (i < len) {
    (result as Record<number, DomWrapper<T>>)[i] = elementWrappers[i]!;
    i++;
  }

  return result;
}
