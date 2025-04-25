import { signal } from "./signal";
import { cleanup } from "./render";
import { createElement, getItemId, isDifferentItem, shallowDiffers, updateNodeContent } from "./dom";
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
  let rootID: string;
  let rootElement: HTMLElement | null = null;

  return {
    map(mapFn: (item: WriteableSignal<T>, index: number) => VNode): VNodeFlatFn {
      const nodes: VNode[] = [];
      const signals: WriteableSignal<T>[] = [];
      const domMap = new Map<VNodeString, Node>();
      const signalMap = new Map<VNodeString, WriteableSignal<T>>();

      // Create a function reference that will be set in processVNode
      const fn = () => {
        // Use parent ID if available, otherwise generate a random one
        rootID = String((fn as VNodeFlatFn)._parent || getRandom());

        // Always create a div with the ID
        return html.Div({ id: rootID });
      };

      // Mark as a flattenable function
      fn._flatten = true as const;

      // Setup subscription for updates
      unsubscribe = items.subscribe((newArray) => {
        // Get parent element from the created element
        if (!rootElement) {
          // Try to get the element by ID
          if (rootID) {
            const el = document.getElementById(rootID);
            if (el) {
              rootElement = el;
            }
          }
        }

        if (!rootElement) {
          console.warn(`List component couldn't find root element with id ${rootID || "unknown"}`);
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
            const domNode = createElement(nodes[i]);
            fragment.appendChild(domNode);
            const id = getItemId(initial[i]);
            if (id !== undefined) {
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
          return;
        }

        // Simple swap rows case (common in benchmarks)
        if (newArray.length === signals.length) {
          let diffs = 0;
          for (let i = 0; i < signals.length; i++) {
            if (isDifferentItem(signals[i](), newArray[i]) && ++diffs > 2) break;
          }
          if (diffs === 2) {
            const indices: number[] = [];
            for (let i = 0; i < signals.length; i++) {
              if (isDifferentItem(signals[i](), newArray[i])) indices.push(i);
            }
            const [idx1, idx2] = indices;
            const node1 = rootElement.childNodes[idx1];
            const node2 = rootElement.childNodes[idx2];
            if (node1 && node2) {
              const placeholder = document.createComment("");
              rootElement.replaceChild(placeholder, node1);
              rootElement.replaceChild(node1, node2);
              rootElement.replaceChild(node2, placeholder);
              signals[idx1].set(newArray[idx1]);
              signals[idx2].set(newArray[idx2]);
              const id1 = getItemId(newArray[idx1]);
              const id2 = getItemId(newArray[idx2]);
              if (id1 !== undefined) {
                domMap.set(id1, node2);
                signalMap.set(id1, signals[idx1]);
              }
              if (id2 !== undefined) {
                domMap.set(id2, node1);
                signalMap.set(id2, signals[idx2]);
              }
              return;
            }
          }
        }

        // Update existing items case
        if (
          newArray.length === signals.length &&
          newArray.every((item: T, i: number) => !isDifferentItem(signals[i](), item))
        ) {
          const changed: number[] = [];
          for (let i = 0; i < newArray.length; i++) {
            if ((isObject(signals[i]()) && signals[i]() !== null &&
              isObject(newArray[i]) && newArray[i] !== null)
              ? shallowDiffers(signals[i]() as object, newArray[i] as object)
              : signals[i]() !== newArray[i]) {
              signals[i].set(newArray[i]);
              changed.push(i);
            }
          }
          for (const i of changed) {
            const domNode = rootElement.childNodes[i];
            if (domNode) {
              updateNodeContent(
                domNode as Element,
                createElement(mapFn(signals[i], i)) as Element
              );
            }
          }
          return;
        }

        // Full rerender case
        const newSignals = new Array(newArray.length);
        const newNodes = new Array(newArray.length);
        const newDomNodes = new Array(newArray.length);

        for (let i = 0; i < newArray.length; i++) {
          const item = newArray[i];
          const id = getItemId(item);
          const sig = id !== undefined ? signalMap.get(id) : null;
          if (sig && id !== undefined && domMap.get(id)) {
            sig.set(item);
            newDomNodes[i] = domMap.get(id)!;
            newSignals[i] = sig;
            newNodes[i] = nodes[signals.indexOf(sig)];
            domMap.delete(id);
            signalMap.delete(id);
          } else {
            newSignals[i] = signal(item);
            newNodes[i] = mapFn(newSignals[i], i);
            newDomNodes[i] = createElement(newNodes[i]);
            if (id !== undefined) {
              domMap.set(id, newDomNodes[i]);
              signalMap.set(id, newSignals[i]);
            }
          }
        }

        domdiff(rootElement, Array.from(rootElement.childNodes), newDomNodes.filter(Boolean));
        signals.splice(0, signals.length, ...newSignals);
        nodes.splice(0, nodes.length, ...newNodes);
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
