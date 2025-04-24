import { cleanup } from "./render";
import { computed, signal } from "./signal";
import type { Signal, VNode, VNodeString, WriteableSignal } from "./types";
import { getRootElement, createElement, getItemId, isDifferentItem, shallowDiffers, updateNodeContent } from "./utils";
import domdiff from "domdiff";

/**
 * Creates a special VNode for inline conditional rendering
 *
 * @param condition - Function that returns a boolean 
 * @param thenBranch - VNode to render when condition is true
 * @param elseBranch - Optional VNode to render when condition is false
 * @returns A special VNode that will be handled by createElement
 */
export function When<T extends VNode>(
  condition: () => boolean,
  thenBranch: T,
  elseBranch?: T
): VNode {
  return {
    __special: "when",
    __condition: condition,
    __thenBranch: thenBranch,
    __elseBranch: elseBranch
  } as unknown as VNode;
}

/**
 * Creates a special VNode for inline list rendering
 * 
 * @param items - Signal containing an array of items
 * @param mapFn - Function to map each item to a VNode
 * @returns A special VNode that will be handled by createElement
 */
export function List<T>(
  items: Signal<T[]>,
  mapFn: (item: WriteableSignal<T>, index: number) => VNode
): VNode {
  return {
    __special: "list",
    __items: items,
    __mapFn: mapFn
  } as unknown as VNode;
}

/**
 * Renders a reactive condition to a DOM element.
 * The provided function will be re-evaluated when its dependencies change.
 * 
 * @param vNodeFn - Function that returns a VNode based on reactive state
 * @param rootSelector - CSS selector for the container element
 * @returns Cleanup function to remove event listeners and subscriptions
 */
export function condition(vNodeFn: () => VNode, rootSelector: string): () => void {
  // Create a computed signal wrapping the VNode function
  const computedVNode = computed(vNodeFn);
  let currentNode: Node | null = null;
  let initialized = false;

  // Setup subscription for updates - root element is obtained inside here
  const unsubscribe = computedVNode.subscribe((newVNode) => {
    // Get root element - we do this inside the subscription to ensure it exists
    const root = getRootElement(rootSelector);

    if (!initialized) {
      // Initial render
      currentNode = createElement(newVNode);
      root.appendChild(currentNode);
      initialized = true;
    } else if (currentNode) {
      // Update existing node
      const newNode = createElement(newVNode);
      root.replaceChild(newNode, currentNode);

      // Clean up existing node
      cleanup(currentNode);
      currentNode = newNode;
    }
  });

  return () => {
    unsubscribe();
    if (currentNode) cleanup(currentNode);
  };
}

/**
 * Renders a reactive list to a DOM element.
 * The provided mapping function will transform each item into a VNode.
 * 
 * @param items - Signal containing an array of items
 * @param mapFn - Function to map each item to a VNode
 * @param rootSelector - CSS selector for the container element
 * @returns Cleanup function to remove event listeners and subscriptions
 */
export function list<T>(
  items: Signal<T[]>,
  mapFn: (item: WriteableSignal<T>, index: number) => VNode,
  rootSelector: string
): () => void {
  const nodes: VNode[] = [];
  const signals: WriteableSignal<T>[] = [];
  const domMap = new Map<VNodeString, Node>();
  const signalMap = new Map<VNodeString, WriteableSignal<T>>();
  let initialized = false;

  // Setup subscription for updates - root element is obtained inside here
  const unsubscribe = items.subscribe((newArray) => {
    // Get root element - we do this inside the subscription to ensure it exists
    const root = getRootElement(rootSelector);

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
      root.appendChild(fragment);
      initialized = true;
      return;
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

  return () => {
    unsubscribe();

    // Cleanup nodes if initialized
    if (initialized) {
      try {
        const root = getRootElement(rootSelector);
        Array.from(root.childNodes).forEach(cleanup);
      } catch (e) {
        // Ignore errors if root element is gone
      }
    }
  };
}