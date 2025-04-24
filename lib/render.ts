import { effect, type Signal, signal } from "./signal";
import type { VNode } from "./types";
import { getRootElement } from "./utils/dom";
import domdiff from "domdiff";
import { createElement, getItemId, isDifferentItem, shallowDiffers, updateNodeContent } from "./mount";

/**
 * Unified render function that handles both single elements and lists
 */
export function render<T>(
  source: VNode | Signal<T[]>,
  rootSelector?: string
) {
  // Only get root element immediately for non-signal sources
  const rootElement = !(source instanceof Function) ? getRootElement(rootSelector) : null;
  let cleanup: (() => void) | undefined;

  // Return object with methods
  const result = {
    // Map function for lists
    map: (mapFn: (item: Signal<T>, index: number) => VNode) => {
      if (!(source instanceof Function)) {
        throw new Error("map() can only be called on Signal<Array>");
      }

      const nodes: VNode[] = [];
      const signals: Signal<T>[] = [];
      const initial = source();
      const domMap = new Map<any, Node>();
      const signalMap = new Map<any, Signal<T>>();

      const fragment = document.createDocumentFragment();
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

      // Setup reactivity for array changes
      cleanup = source.subscribe(() => {
        // and is up-to-date when the signal changes
        const root = getRootElement(rootSelector);
        console.log(root)
        const newArray = source();

        // Append initial nodes on first run
        if (fragment.firstChild) {
          root.appendChild(fragment);
        }

        if (!newArray.length) {
          root.replaceChildren();
          signals.length = nodes.length = 0;
          domMap.clear();
          signalMap.clear();
          return;
        }

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
            const node1 = root.childNodes[idx1];
            const node2 = root.childNodes[idx2];
            if (node1 && node2) {
              const placeholder = document.createComment("");
              root.replaceChild(placeholder, node1);
              root.replaceChild(node1, node2);
              root.replaceChild(node2, placeholder);
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

        if (
          newArray.length === signals.length &&
          newArray.every((item, i) => !isDifferentItem(signals[i](), item))
        ) {
          const changed: number[] = [];
          for (let i = 0; i < newArray.length; i++) {
            if (shallowDiffers(signals[i](), newArray[i])) {
              signals[i].set(newArray[i]);
              changed.push(i);
            }
          }
          for (const i of changed) {
            const domNode = root.childNodes[i];
            if (domNode) {
              updateNodeContent(
                domNode as Element,
                createElement(mapFn(signals[i], i)) as Element
              );
            }
          }
          return;
        }

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

        domdiff(root, Array.from(root.childNodes), newDomNodes.filter(Boolean));
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

      return nodes;
    },

    // Cleanup method to remove event listeners and subscriptions
    cleanup: () => {
      if (cleanup) cleanup();
    }
  };

  // Handle single VNode case immediately
  if (!(source instanceof Function)) {
    rootElement!.appendChild(createElement(source));
    return result;
  }

  return result;
}
