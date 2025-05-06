import { createElement, EventDelegator } from "../dom";
import type { VNode } from "../types";
import { scope, setCurrentScope, getCurrentScope } from "../reactive";

export const rootRegistry = new Map<string, EventDelegator>();

export function render(
  vNode: VNode | string | (() => unknown),
  rootSelector: string = "#app"
): {
  cleanup: () => void;
} {
  const root = document.querySelector(rootSelector) as HTMLElement;
  if (!root) throw new Error(`Root element not found for selector: ${rootSelector}`);

  const delegator = new EventDelegator(rootSelector);
  rootRegistry.set(rootSelector, delegator);

  const renderScope = scope(() => {
    createElement(vNode, root, rootSelector);
  });

  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;

    delegator.cleanup();
    rootRegistry.delete(rootSelector);

    renderScope.cleanup();

    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }

    cleaned = true;
  };

  return {
    cleanup
  };
}