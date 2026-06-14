import type { HellaNode, HellaElement } from "./types/nodes";
import { resolveValue } from "./internal/utils";
import { setMountNode, dispatchError, toError } from "./internal/dispatch";
import { mountNode } from "./internal/render";
import { registerContainer } from "./internal/queue";
import { getState } from "./internal/state";

// Wrapper breaks circular import: dispatch.ts needs mountNode from render.ts, render.ts imports from dispatch.ts
setMountNode((node: HellaNode) => mountNode(node) as Node);

/**
 * Mounts a HellaNode to a DOM element, replacing all existing content.
 * Supports async component functions — the container mounts the resolved node when the Promise settles.
 * @param node The HellaNode or component function to mount (sync or async)
 * @param target CSS selector string or Element to mount into (defaults to "#app")
 */
export function mount(
  node: HellaNode | (() => HellaNode) | (() => Promise<HellaNode>),
  target: string | Element = "#app"
) {
  const attach = (resolvedNode: HellaNode) => {
    const mountedNode = mountNode(resolvedNode) as HellaElement;
    const container = typeof target === "string" ? document.querySelector(target) : target;
    if (!container) throw new Error(`[dom] mount: target "${target}" not found in document`);
    container.replaceChildren(mountedNode);
    registerContainer(container);
    if (mountedNode.nodeType === Node.ELEMENT_NODE) {
      getState(mountedNode).isMounted = true;
    }
  };

  const resolved = resolveValue(node);

  if (
    resolved !== null &&
    typeof resolved === "object" &&
    typeof (resolved as { then?: unknown }).then === "function") {
    (resolved as Promise<HellaNode>).then(attach, (err: unknown) => {
      dispatchError(toError(err), { phase: 'mount' });
    });
    return;
  }

  attach(resolved as HellaNode);
}
