import { reactive } from "./internal/reactive";
import { mutationCallbacks } from "./registry";
import type { DomWrapper, DomCollection, HellaPrimitive, HellaProps, ElementHooks } from "./types/nodes.d.ts";
import type { DOMEventMap } from "./types/attributes.d.ts";

type MultiOp = (nodes: Element[]) => void;

export const multiSelectors = new Map<string, {
  ops: MultiOp[];
  processedNodes: WeakSet<Element>;
}>();

let multiCheckScheduled = false;

/**
 * Creates a reactive reference to multiple DOM elements with auto-watching.
 * Automatically applies operations to newly added elements matching the selector.
 * Use $ref for single element references without collection overhead.
 * 
 * @param selector CSS selector string
 * @returns ReactiveRef collection with bind/on/hooks/forEach chainable methods
 */
export function $collection<T extends Element = Element>(selector: string): DomCollection<T> {
  const elementWrappers: DomWrapper<T>[] = [];
  const queuedOps: Array<(wrapper: DomWrapper<T>, index: number) => void> = [];

  const applyAndQueue = (op: (wrapper: DomWrapper<T>, index: number) => void) => {
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
      const wrapper = reactive(nodes[i] as T);
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
  } as DomCollection<T>;

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

  result.forEach = (callback: (element: DomWrapper<T>, index: number) => void) => {
    applyAndQueue(callback);
    return result;
  };

  result.dispose = () => {
    unregisterMultiOp(selector, processNewNodes);
    queuedOps.length = 0;
  };

  let i = 0;
  while (i < elementWrappers.length) {
    (result as Record<number, DomWrapper<T>>)[i] = elementWrappers[i];
    i++;
  }

  return result;
}

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

export function scheduleMultiCheck() {
  if (!multiCheckScheduled && multiSelectors.size > 0) {
    multiCheckScheduled = true;
    setTimeout(checkMultiSelectors, 0);
  }
}

export function ensureMutationWatching() {
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