import type { VNode, ContextElement } from "../types";
import { createElement, EventDelegator } from "../dom";

// This is a registry of all root elements and their corresponding event delegators
export const rootRegistry = new Map<string, EventDelegator>();

export function render(
  vNode: VNode | string | (() => unknown),
  rootSelector: string = "#app"
): {
  cleanup: () => void;
} {
  // Get the root element
  const root = document.querySelector(rootSelector) as HTMLElement;
  if (!root) throw new Error(`Root element not found for selector: ${rootSelector}`);

  // Create a new event delegator for the root element
  const delegator = new EventDelegator(rootSelector);

  // Add this root element to the registry
  rootRegistry.set(rootSelector, delegator);

  // Render the virtual node into the root element
  const rootElement = createElement(vNode, root, rootSelector);

  // Set a flag for fastpath exit during cleanup
  let cleaned = false;

  // 
  const cleanup = () => {
    if (cleaned) return;

    const context = (rootElement as ContextElement)?._context;
    context?.cleanup();

    delegator.cleanup();
    rootRegistry.delete(rootSelector);

    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }

    cleaned = true;
  };

  return {
    cleanup
  };
}