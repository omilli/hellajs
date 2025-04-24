import { cleanup } from "./render";
import { computed } from "./signal";
import type { VNode } from "./types";
import { getRootElement, createElement } from "./utils";

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