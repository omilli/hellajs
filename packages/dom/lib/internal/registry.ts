/**
 * DOM node cleanup system for reactive effects and delegated events.
 * Stores effects and event handlers directly on DOM elements and automatically
 * disposes them when nodes are detached from the document.
 */
import { effect } from "./core";
import type { HellaElement, HookStacks, HookType } from "../types";

/**
 * Property keys for storing framework data on elements.
 */
const EFFECTS_KEY = "__hella_effects" as const;
export const HANDLERS_KEY = "__hella_handlers" as const;
const HOOKS_KEY = "__hella_hooks" as const;

/**
 * Cleanup coordination flags and queue.
 */
export let isCleaning = false;
export let cleanupScheduled = false;
export const cleanupQueue = new Set<Node>();

/**
 * Mount coordination flags and queue.
 */
export let isMounting = false;
export let mountScheduled = false;
export const mountQueue = new Set<Node>();

/**
 * Multi-element operations that persist across DOM mutations.
 * Maps CSS selectors to operations and a WeakSet tracking processed nodes.
 */
type MultiOp = (nodes: Element[]) => void;
export let multiCheckScheduled = false;

/**
 * Gets or creates the hook stacks for an element.
 * @param element The DOM element
 * @returns The hook stacks object
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

export const multiSelectors = new Map<string, {
  ops: MultiOp[];
  processedNodes: WeakSet<Element>;
}>();

/**
 * Adds a hook to an element's stack.
 * @param element The DOM element
 * @param type The hook type (mount, destroy, etc.)
 * @param fn The callback function to execute
 */
export function addHook(
  element: HellaElement,
  type: HookType,
  fn: (() => void) | ((node: Element) => void)
) {
  const stacks = getHookStacks(element);
  (stacks[type] as Array<typeof fn>).push(fn);
}

/**
 * Registers an operation to execute on all matching elements, now and in the future.
 * Operations persist and apply to new elements as they're added to the DOM.
 * @param selector CSS selector for target elements
 * @param op Operation to execute when elements are found
 * @param initialNodes Optional array of nodes already processed (to prevent duplicates)
 * @returns Unique operation ID for later unregistration
 */
export function registerMultiOp(selector: string, op: MultiOp, initialNodes?: Element[]): symbol {
  const entry = multiSelectors.get(selector) || {
    ops: [],
    processedNodes: new WeakSet()
  };
  entry.ops.push(op);

  // Mark initial nodes as already processed to prevent duplicate applications
  if (initialNodes) {
    let i = 0;
    while (i < initialNodes.length) {
      entry.processedNodes.add(initialNodes[i++]);
    }
  }

  multiSelectors.set(selector, entry);

  // Return unique ID for this specific operation
  return Symbol();
}

/**
 * Unregisters a specific operation for a selector.
 * @param selector CSS selector
 * @param op Operation to remove
 */
export function unregisterMultiOp(selector: string, op: MultiOp) {
  const entry = multiSelectors.get(selector);
  if (!entry) return;

  const index = entry.ops.indexOf(op);
  if (index !== -1) {
    entry.ops.splice(index, 1);
  }

  // Clean up empty entries
  if (entry.ops.length === 0) {
    multiSelectors.delete(selector);
  }
}

/**
 * Checks multi-element selectors and executes operations on new elements only.
 * Uses WeakSet to track which nodes have already been processed.
 */
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

/**
 * Schedules a check for multi-element selectors with debouncing.
 */
function scheduleMultiCheck() {
  if (!multiCheckScheduled) {
    multiCheckScheduled = true;
    setTimeout(checkMultiSelectors, 0);
  }
}

/**
 * Runs all hooks of a given type for an element.
 * Hooks receive the element as first argument (except beforeMount and destroy).
 * @param element The DOM element
 * @param type The hook type to run
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
 * Processes all queued nodes for cleanup in a non-blocking deferred manner.
 */
export function processCleanupQueue() {
  if (isCleaning) return;
  isCleaning = true;
  cleanupScheduled = false;

  for (const node of cleanupQueue) {
    // Nodes that still have a parent are still part of the tree; skip cleanup for moves.
    if ((node as ChildNode).isConnected || (node as ChildNode).parentNode) continue;
    cleanWithDescendants(node);
  }
  cleanupQueue.clear();

  isCleaning = false;
}

/**
 * Processes all queued nodes for mounting asynchronously after nodes are in the DOM.
 */
export function processMountQueue() {
  if (isMounting) return;
  isMounting = true;
  mountScheduled = false;

  for (const node of mountQueue) {
    // Only mount nodes that are actually connected to the DOM
    if (!(node as ChildNode).isConnected) continue;
    mountWithDescendants(node);
  }
  mountQueue.clear();

  isMounting = false;
}

/**
 * Global MutationObserver that detects node removals/additions and queues them for processing.
 * Defers actual cleanup to avoid blocking the main thread during mass node removal.
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

    if (hasRemovals && !cleanupScheduled) {
      cleanupScheduled = true;
      setTimeout(processCleanupQueue, 0);
    }

    if (hasAdditions) {
      if (!mountScheduled) {
        mountScheduled = true;
        setTimeout(processMountQueue, 0);
      }

      if (multiSelectors.size > 0 && !multiCheckScheduled) {
        multiCheckScheduled = true;
        setTimeout(checkMultiSelectors, 0);
      }
    }
  });

  observer.observe(document, {
    childList: true,
    subtree: true
  });
}

/**
 * Disposes effects and clears events for a node. Safe to call multiple times.
 * @param node The node to clean
 */
function clean(node: Node) {
  const element = node as HellaElement;

  // Run beforeDestroy hooks
  runHooks(element, "beforeDestroy");

  // Dispose component scope if it exists
  element.__hella_component_scope?.();

  // Run portal cleanup if it exists
  element.__hella_portal_cleanup?.();

  element[EFFECTS_KEY]?.forEach(fn => fn());

  delete element[EFFECTS_KEY];

  delete element[HANDLERS_KEY];

  delete element.__hella_mounted;

  // Run afterDestroy hooks
  runHooks(element, "afterDestroy");
  delete element[HOOKS_KEY];
  delete element.__hella_component_scope;
  delete element.__hella_portal_cleanup;
}

/**
 * Mounts a node and all its descendants iteratively.
 * @param node Root node to mount
 */
function mountWithDescendants(node: Node) {
  const stack: Node[] = [node];
  let current: Node | undefined;

  while ((current = stack.pop())) {
    const element = current as HellaElement;
    element.__hella_mounted = true;
    runHooks(element, "afterMount");

    if (current.nodeType === 1 && current.hasChildNodes()) {
      const children = current.childNodes;
      let i = children.length;
      while (i--) stack.push(children[i]);
    }
  }
}

/**
 * Cleans a node and all its descendants iteratively.
 * @param node Root node to clean
 */
function cleanWithDescendants(node: Node) {
  const stack: Node[] = [node];
  let current: Node | undefined;

  while ((current = stack.pop())) {
    clean(current);

    if (current.nodeType === 1 && current.hasChildNodes()) {
      const children = current.childNodes;
      let i = children.length;
      while (i--) stack.push(children[i]);
    }
  }
}

/**
 * Registers a reactive effect for a node with automatic cleanup.
 * The effect disposer is stored and invoked during cleanup.
 * Optimizes for single effect case (common) by storing directly on element.
 * @param element Host DOM element
 * @param effectFn Effect function to execute reactively
 * @param parent Optional parent element for hook execution
 */
export function addRegistryEffect(
  element: HellaElement,
  effectFn: () => void,
  parent?: HellaElement
) {
  const dispose = effect(() => {
    const hookElement = parent || element;
    hookElement?.__hella_mounted && runHooks(hookElement, "beforeUpdate");
    effectFn();
    hookElement?.__hella_mounted && runHooks(hookElement, "afterUpdate");
  });

  !element[EFFECTS_KEY] ?
    element[EFFECTS_KEY] = new Set([dispose])
    : element[EFFECTS_KEY].add(dispose);
}

/**
 * Registers an event handler for a node.
 * Used by the global event delegation system for lookup and cleanup.
 * @param element Host DOM element
 * @param type Event type (e.g., "click")
 * @param handler Event listener function
 */
export function addRegistryEvent(element: HellaElement, type: string, handler: EventListener) {
  element[HANDLERS_KEY] = element[HANDLERS_KEY] || {};
  element[HANDLERS_KEY][type] = handler;
}