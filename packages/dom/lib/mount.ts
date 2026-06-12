import type { HellaNode, HellaElement } from "./types/nodes";
import { resolveValue } from "./internal/utils";
import { setMountNode } from "./internal/dispatch";
import { mountNode } from "./internal/render";
import { registerContainer } from "./internal/queue";
import { getState } from "./internal/state";

setMountNode((node: HellaNode) => mountNode(node) as Node);

/**
 * Mounts a HellaNode to a DOM element, replacing all existing content.
 * @param node The HellaNode or component function to mount
 * @param target CSS selector string or Element to mount into (defaults to "#app")
 */
export function mount(
  node: HellaNode | (() => HellaNode) | (() => Promise<HellaNode>),
  target: string | Element = "#app"
) {
  const mountedNode = mountNode(resolveValue(node) as HellaNode) as HellaElement;
  const container = typeof target === "string" ? document.querySelector(target) : target;
  if (!container) throw new Error(`[dom] mount: target "${target}" not found in document`);
  registerContainer(container);
  container.replaceChildren(mountedNode);
  if (mountedNode.nodeType === Node.ELEMENT_NODE) {
    getState(mountedNode).mounted = true;
  }
}
