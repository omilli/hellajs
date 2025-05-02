import type { VNode } from "../types";
import type { ComponentElement } from "../ui";
import { createElement } from "./element";
import { EventDelegator } from "./event";

export const rootRegistry = new Map<string, EventDelegator>();

export function render(
  vNode: VNode | string | (() => unknown),
  rootSelector: string = "#app"
): () => void {
  const root = document.querySelector(rootSelector) as HTMLElement;
  if (!root) throw new Error(`Root element not found for selector: ${rootSelector}`);

  const delegator = new EventDelegator(rootSelector);

  rootRegistry.set(rootSelector, delegator);
  const node = createElement(vNode, root, rootSelector);

  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;

    const context = (node as ComponentElement)?.__componentContext;
    context?.cleanup();

    delegator.cleanup();
    rootRegistry.delete(rootSelector);

    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }

    cleaned = true;
  };

  return cleanup;
}