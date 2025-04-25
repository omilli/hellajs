import { signal } from "./signal";
import { cleanup } from "./render";
import { createElement, getItemId, isDifferentItem, shallowDiffers } from "./dom";
import domdiff from "domdiff";
import type { VNodeFlatFn, ReadonlySignal, SignalUnsubscribe, VNode, VNodeString, WriteableSignal } from "./types";
import { isObject } from "./utils";
import { html } from "./html";

function getRandom() {
  return Math.random().toString(36).substring(4);
}

/**
 * Creates a reactive list with fluent API.
 * Use the map method to transform items into VNodes.
 * 
 * @param items - Signal containing an array of items
 * @returns Object with map method to define item rendering
 */
export function List<T>(items: ReadonlySignal<T[]>) {
  let unsubscribe: SignalUnsubscribe = () => { };
  let initialized = false;
  let parentID: string;
  let rootSelector: string;
  let rootElement: HTMLElement | null = null;

  // Track DOM nodes directly - key is the data item's ID or index
  const nodeMap = new Map<string | number, Node>();

  return {
    map(mapFn: (item: WriteableSignal<T>, index: number) => VNode): VNodeFlatFn {
      const nodes: VNode[] = [];
      const signals: WriteableSignal<T>[] = [];
      const domMap = new Map<VNodeString, Node>();
      const signalMap = new Map<VNodeString, WriteableSignal<T>>();

      // Create a function reference that will be set in processVNode
      const fn = () => {
        // Use parent ID if available, otherwise generate a random one
        parentID = (fn as VNodeFlatFn)._parent as string || getRandom();
        rootSelector = (fn as VNodeFlatFn).rootSelector as string;
      };

      // Mark as a flattenable function
      fn._flatten = true;

      // Setup subscription for updates
      unsubscribe = items.subscribe((newArray) => {
        rootElement = document.getElementById(parentID)

        if (!rootElement) {
          return;
        }

        // Initial rendering
        if (!initialized) {
          const fragment = document.createDocumentFragment();
          const initial = newArray || [];

          // Create initial nodes
          for (let i = 0; i < initial.length; i++) {
            signals[i] = signal(initial[i]);
            nodes[i] = mapFn(signals[i], i);
            const domNode = createElement(nodes[i], rootSelector);
            fragment.appendChild(domNode);

            // Store both by index and ID (if available)
            nodeMap.set(i, domNode);

            const id = getItemId(initial[i]);
            if (id !== undefined) {
              nodeMap.set(id, domNode);
              domMap.set(id, domNode);
              signalMap.set(id, signals[i]);
            }
          }

          // Append initial nodes
          rootElement.appendChild(fragment);
          initialized = true;
          return;
        }

        // Special case: empty array
        if (!newArray || !newArray.length) {
          rootElement.replaceChildren();
          signals.length = nodes.length = 0;
          domMap.clear();
          signalMap.clear();
          nodeMap.clear();
          return;
        }

        // Simple swap rows case (common in benchmarks)
        if (newArray.length === signals.length) {
          let diffs = 0;
          const diffIndices: number[] = [];

          // First, identify which items have changed positions
          for (let i = 0; i < signals.length; i++) {
            if (isDifferentItem(signals[i](), newArray[i])) {
              diffIndices.push(i);
              if (++diffs > 2) break; // Only optimize for 1-2 item swaps
            }
          }
        }

        // Update existing items case - no reordering, just value updates
        if (
          newArray.length === signals.length &&
          newArray.every((item: T, i: number) => !isDifferentItem(signals[i](), item))
        ) {
          // Just update all signal values and let the reactivity system handle DOM updates
          for (let i = 0; i < newArray.length; i++) {
            if ((isObject(signals[i]()) && signals[i]() !== null &&
              isObject(newArray[i]) && newArray[i] !== null)
              ? shallowDiffers(signals[i]() as object, newArray[i] as object)
              : signals[i]() !== newArray[i]) {

              // Update the signal value - this triggers reactive updates
              signals[i].set(newArray[i]);
            }
          }
          return;
        }

        // Full rerender case - complex changes requiring reordering
        const newSignals = new Array(newArray.length);
        const newNodes = new Array(newArray.length);
        const newDomNodes = new Array(newArray.length);
        const newNodeMap = new Map<string | number, Node>();

        // Process all items first
        for (let i = 0; i < newArray.length; i++) {
          const item = newArray[i];
          const id = getItemId(item);

          // Try to reuse existing signal/node by ID for stability
          const sig = id !== undefined ? signalMap.get(id) : null;

          if (sig && id !== undefined && domMap.get(id)) {
            // Reuse existing node
            sig.set(item);
            newDomNodes[i] = domMap.get(id)!;
            newSignals[i] = sig;
            newNodes[i] = nodes[signals.indexOf(sig)];

            // Update tracking maps
            newNodeMap.set(i, newDomNodes[i]);
            newNodeMap.set(id, newDomNodes[i]);

            // Remove from old maps to track what's been used
            domMap.delete(id);
            signalMap.delete(id);
          } else {
            // Create new node
            newSignals[i] = signal(item);
            newNodes[i] = mapFn(newSignals[i], i);
            newDomNodes[i] = createElement(newNodes[i], rootSelector);

            // Update tracking
            newNodeMap.set(i, newDomNodes[i]);
            if (id !== undefined) {
              newNodeMap.set(id, newDomNodes[i]);
            }
          }
        }

        // Let domdiff handle the DOM updates efficiently
        const currentChildren = Array.from(rootElement.childNodes);
        domdiff(rootElement, currentChildren, newDomNodes.filter(Boolean));

        // Update all our tracking state
        signals.splice(0, signals.length, ...newSignals);
        nodes.splice(0, nodes.length, ...newNodes);
        nodeMap.clear();

        // Copy entries from newNodeMap to nodeMap
        for (const [key, value] of newNodeMap.entries()) {
          nodeMap.set(key, value);
        }

        domMap.clear();
        signalMap.clear();

        for (let i = 0; i < newArray.length; i++) {
          const id = getItemId(newArray[i]);
          if (id !== undefined) {
            domMap.set(id, newDomNodes[i]);
            signalMap.set(id, newSignals[i]);
          }
        }
      });

      return fn as VNodeFlatFn;
    },
    cleanup: () => {
      unsubscribe();
      nodeMap.clear();

      // Cleanup nodes if initialized
      if (initialized && rootElement) {
        try {
          Array.from(rootElement.childNodes).forEach(cleanup);
        } catch (e) {
          // Ignore errors if root element is gone
        }
      }
    }
  };
}
