import { signal } from "./signal";
import type { Signal, VNode, WithId, WriteableSignal } from "./types";
import { getRootElement } from "./utils/dom";
import domdiff from "domdiff";
import { createElement, getItemId, isDifferentItem, shallowDiffers, updateNodeContent } from "./mount";

/**
 * Result object returned from the render function
 */
export interface RenderResult<T> {
  map: (mapFn: (item: WriteableSignal<T>, index: number) => VNode) => VNode[];
  cleanup: () => void;
}

/**
 * Unified render function that handles both single elements and lists
 */
export function render<T>(
  source: VNode | Signal<T[]>,
  rootSelector?: string
): RenderResult<T> {
  // Only get root element immediately for non-signal sources
  const rootElement = !(source instanceof Function) ? getRootElement(rootSelector) : null;
  let cleanup: (() => void) | undefined;

  // Return object with methods
  const result = {
    // Map function for lists
    map: (mapFn: (item: WriteableSignal<T>, index: number) => VNode) => {
      if (!(source instanceof Function)) {
        throw new Error("map() can only be called on Signal<Array>");
      }

      const nodes: VNode[] = [];
      const signals: WriteableSignal<T>[] = [];
      const initial = (source as Signal<T[]>)();
      const domMap = new Map<string | number, Node>();
      const signalMap = new Map<string | number, WriteableSignal<T>>();

      const fragment = document.createDocumentFragment();

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

      // Setup reactivity for array changes - handle both regular and computed signals
      if (typeof (source as Signal<T[]>).subscribe === 'function') {
        cleanup = (source as Signal<T[]>).subscribe((newArray) => {
          const root = getRootElement(rootSelector);

          // Append initial nodes on first run if any
          if (fragment.firstChild) {
            root.appendChild(fragment);
          }

          // Special case: empty array
          if (!newArray || !newArray.length) {
            root.replaceChildren();
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

          // Update existing items case
          if (
            newArray.length === signals.length &&
            newArray.every((item: T, i: number) => !isDifferentItem(signals[i](), item))
          ) {
            const changed: number[] = [];
            for (let i = 0; i < newArray.length; i++) {
              if ((typeof signals[i]() === 'object' && signals[i]() !== null &&
                typeof newArray[i] === 'object' && newArray[i] !== null)
                ? shallowDiffers(signals[i]() as object, newArray[i] as object)
                : signals[i]() !== newArray[i]) {
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
      } else {
        // Warning for signals without subscribe method
        console.warn('Signal used with render() has no subscribe method');

        // Fallback to just displaying initial values
        const root = getRootElement(rootSelector);
        if (fragment.firstChild) {
          root.appendChild(fragment);
        }
      }

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
