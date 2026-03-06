/**
 * DOM node lifecycle system for reactive effects and delegated events.
 * Stores effects and event handlers directly on DOM elements and automatically
 * disposes them when nodes are detached from the document.
 */
import { effect, signal } from "./internal/core";
import { handlerCounts } from "./internal/counts";
import { removeDirectHandlers } from "./internal/direct-events";
import type { HellaElement, HookStacks, HookType } from "./types/nodes.d.ts";

const EFFECTS_KEY = "__hella_effects";
const HANDLERS_KEY = "__hella_handlers";
const HOOKS_KEY = "__hella_hooks";

/**
 * Exported state for direct access by testing and $ref.
 * Tree-shakable: modules only pull what they import.
 */
export const cleanupQueue = new Set<Node>();
export const mountQueue = new Set<Node>();
export const mutationCallbacks = new Set<() => void>();

export const isCleaning = signal(false);
export const isMounting = signal(false);
export const cleanupScheduled = signal(false);
export const mountScheduled = signal(false);

/**
 * Error handler registry - allows mount.ts to register error handling
 * that events.ts can call without circular dependency.
 */
let errorHandler: ((origin: Element, error: Error) => void) | null = null;

export function setErrorHandler(handler: (origin: Element, error: Error) => void) {
  errorHandler = handler;
}

export function dispatchError(origin: Element, error: Error): void {
  if (errorHandler) {
    errorHandler(origin, error);
  } else {
    throw error;
  }
}

/**
 * Gets or creates the hook stacks for an element.
 */
function getHookStacks(element: HellaElement): HookStacks {
  if (!element[HOOKS_KEY]) {
    element[HOOKS_KEY] = {
      beforeMount: [],
      afterMount: [],
      beforeDestroy: [],
      afterDestroy: [],
      beforeUpdate: [],
      afterUpdate: [],
    };
  }
  return element[HOOKS_KEY]!;
}

/**
 * Runs all hooks of a given type for an element.
 * Hooks receive the element as first argument (except beforeMount and destroy).
 */
function runHooks(element: HellaElement, type: HookType) {
  const stacks = element[HOOKS_KEY];
  if (!stacks) return;

  const hooks = stacks[type];
  const len = hooks.length;
  if (len === 0) return;

  const passNode = type !== "beforeMount" && type !== "afterDestroy";
  let i = 0;
  while (i < len) {
    passNode ? (hooks[i++] as (node: Element) => void)(element) : (hooks[i++] as () => void)();
  }
}

/**
 * Disposes effects and clears events for a node. Safe to call multiple times.
 */
function clean(node: Node) {
  const element = node as HellaElement;

  runHooks(element, "beforeDestroy");

  element.__hella_component_scope?.();
  element.__hella_portal_cleanup?.();

  element[EFFECTS_KEY]?.forEach(fn => fn());
  delete element[EFFECTS_KEY];

  removeDirectHandlers(element);

  const handlers = element[HANDLERS_KEY];
  if (handlers) {
    for (const type in handlers) {
      const count = handlerCounts.get(type);
      count !== undefined &&
        count > 1 ? handlerCounts.set(type, count - 1) : handlerCounts.delete(type);
    }
    delete element[HANDLERS_KEY];
  }

  delete element.__hella_mounted;

  runHooks(element, "afterDestroy");
  delete element[HOOKS_KEY];
  delete element.__hella_component_scope;
  delete element.__hella_portal_cleanup;
}

/**
 * Traverses a node and all its descendants iteratively, applying a callback to each.
 */
function traverseDescendants(node: Node, callback: (node: Node) => void) {
  const stack: Node[] = [node];
  let current: Node | undefined;

  while ((current = stack.pop())) {
    callback(current);

    if (current.nodeType === 1 && current.hasChildNodes()) {
      const children = current.childNodes;
      let i = children.length;
      while (i--) stack.push(children[i]);
    }
  }
}

/**
 * Processes all queued nodes for cleanup.
 */
export function processCleanupQueue() {
  if (isCleaning()) return;
  isCleaning(true);
  cleanupScheduled(false);

  for (const node of cleanupQueue) {
    if ((node as ChildNode).isConnected || (node as ChildNode).parentNode) continue;
    traverseDescendants(node, clean);
  }

  cleanupQueue.clear();

  isCleaning(false);
}

/**
 * Processes all queued nodes for mounting.
 */
export function processMountQueue() {
  if (isMounting()) return;
  isMounting(true);
  mountScheduled(false);

  for (const node of mountQueue) {
    if (!(node as ChildNode).isConnected) continue;
    traverseDescendants(node, (n) => {
      const element = n as HellaElement;
      element.__hella_mounted = true;
      runHooks(element, "afterMount");
    });
  }
  mountQueue.clear();

  isMounting(false);
}

/**
 * Global MutationObserver that detects node removals/additions and queues them for processing.
 */
if (typeof MutationObserver !== "undefined") {
  const observer = new MutationObserver((mutationsList) => {
    let hasRemovals = false;
    let hasAdditions = false;

    let i = 0;
    while (i < mutationsList.length) {
      const { removedNodes, addedNodes } = mutationsList[i++];

      let j = 0;
      while (j < removedNodes.length) {
        cleanupQueue.add(removedNodes[j++]);
        hasRemovals = true;
      }

      j = 0;
      while (j < addedNodes.length) {
        mountQueue.add(addedNodes[j++]);
        hasAdditions = true;
      }
    }

    if (hasRemovals && !cleanupScheduled()) {
      cleanupScheduled(true);
      setTimeout(processCleanupQueue, 0);
    }

    if (hasAdditions) {
      if (!mountScheduled()) {
        mountScheduled(true);
        setTimeout(processMountQueue, 0);
      }

      for (const callback of mutationCallbacks) {
        callback();
      }
    }
  });

  observer.observe(document, {
    childList: true,
    subtree: true
  });
}

/**
 * Public registry closure - lifecycle management API.
 */
export const registry = {
  addEffect(element: HellaElement, effectFn: () => void) {
    const dispose = effect(() => {
      element.__hella_mounted && runHooks(element, "beforeUpdate");
      effectFn();
      element.__hella_mounted && runHooks(element, "afterUpdate");
    });

    !element[EFFECTS_KEY]
      ? element[EFFECTS_KEY] = [dispose]
      : element[EFFECTS_KEY].push(dispose);
  },

  addEvent(element: HellaElement, type: string, handler: EventListener) {
    element[HANDLERS_KEY] = element[HANDLERS_KEY] || {};
    element[HANDLERS_KEY][type] = handler;
  },

  addHook(
    element: HellaElement,
    type: HookType,
    fn: (() => void) | ((node: Element) => void)
  ) {
    const stacks = getHookStacks(element);
    (stacks[type] as Array<typeof fn>).push(fn);
  }
};
