import { setNodeHandler, isFunction, renderProp, normalizeTextValue } from "./internal";
import { mutationCallbacks, registry } from "./registry";
import type { ReactiveElement, ReactiveRef, HellaPrimitive, HellaProps, DOMEventMap, HellaElement, ElementHooks, HookType } from "./types";

const FORM_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

type MultiOp = (nodes: Element[]) => void;

export const multiSelectors = new Map<string, {
  ops: MultiOp[];
  processedNodes: WeakSet<Element>;
}>();

let multiCheckScheduled = false;

export function checkMultiSelectors() {
  multiCheckScheduled = false;
  if (multiSelectors.size === 0) return;

  for (const [selector, { ops, processedNodes }] of multiSelectors) {
    const nodes = document.querySelectorAll(selector);
    const newNodes: Element[] = [];

    let i = 0;
    while (i < nodes.length) {
      const node = nodes[i++];
      if (!processedNodes.has(node)) {
        processedNodes.add(node);
        newNodes.push(node);
      }
    }

    if (newNodes.length > 0) {
      let j = 0;
      while (j < ops.length) {
        ops[j++](newNodes);
      }
    }
  }
}

function scheduleMultiCheck() {
  if (!multiCheckScheduled && multiSelectors.size > 0) {
    multiCheckScheduled = true;
    setTimeout(checkMultiSelectors, 0);
  }
}

function ensureMutationWatching() {
  if (multiSelectors.size > 0 && !mutationCallbacks.has(scheduleMultiCheck)) {
    mutationCallbacks.add(scheduleMultiCheck);
  }
}

function cleanupMutationWatching() {
  if (multiSelectors.size === 0) {
    mutationCallbacks.delete(scheduleMultiCheck);
  }
}

function registerMultiOp(selector: string, op: MultiOp, initialNodes?: Element[]) {
  const entry = multiSelectors.get(selector) || {
    ops: [],
    processedNodes: new WeakSet()
  };
  entry.ops.push(op);

  if (initialNodes) {
    let i = 0;
    while (i < initialNodes.length) {
      entry.processedNodes.add(initialNodes[i++]);
    }
  }

  multiSelectors.set(selector, entry);
  ensureMutationWatching();
}

function unregisterMultiOp(selector: string, op: MultiOp) {
  const entry = multiSelectors.get(selector);
  if (!entry) return;

  const index = entry.ops.indexOf(op);
  if (index !== -1) {
    entry.ops.splice(index, 1);
  }

  if (entry.ops.length === 0) {
    multiSelectors.delete(selector);
  }

  cleanupMutationWatching();
}

export function $ref<T extends Element = Element>(selector: string): ReactiveRef<T> {
  const elementWrappers: ReactiveElement<T>[] = [];
  const queuedOps: Array<(wrapper: ReactiveElement<T>, index: number) => void> = [];

  const applyAndQueue = (op: (wrapper: ReactiveElement<T>, index: number) => void) => {
    let i = 0;
    while (i < elementWrappers.length) {
      op(elementWrappers[i], i);
      i++;
    }
    queuedOps.push(op);
  };

  const processNewNodes = (nodes: Element[]) => {
    let i = 0;
    while (i < nodes.length) {
      const wrapper = reactiveElement(nodes[i] as T);
      const index = elementWrappers.length;
      elementWrappers.push(wrapper);

      let j = 0;
      while (j < queuedOps.length) {
        queuedOps[j](wrapper, index);
        j++;
      }
      i++;
    }
  };

  const initialNodes = Array.from(document.querySelectorAll(selector) as NodeListOf<T>);
  processNewNodes(initialNodes);

  registerMultiOp(selector, processNewNodes, initialNodes);

  const result = function (index = 0): T | undefined {
    return elementWrappers[index]?.node ?? undefined;
  } as ReactiveRef<T>;

  Object.defineProperty(result, 'length', {
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

  result.forEach = (callback: (element: ReactiveElement<T>, index: number) => void) => {
    applyAndQueue(callback);
    return result;
  };

  result.dispose = () => {
    unregisterMultiOp(selector, processNewNodes);
    queuedOps.length = 0;
  };

  let i = 0;
  while (i < elementWrappers.length) {
    (result as Record<number, ReactiveElement<T>>)[i] = elementWrappers[i];
    i++;
  }

  return result;
}

function reactiveElement<T extends Element>(targetNode: T): ReactiveElement<T> {
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
