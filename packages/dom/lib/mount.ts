import type { HellaNode, HellaElement, MountHandle } from "./types/nodes";
import { resolveValue } from "./internal/utils";
import { setMountNode, dispatchError, toError } from "./internal/dispatch";
import { mountNode } from "./internal/render";
import { registerContainer, processMountQueue, processCleanupQueue, mountQueue } from "./internal/queue";
import { getState } from "./internal/state";
import { cleanupSubtree } from "./internal/cleanup";

// Wrapper breaks circular import: dispatch.ts needs mountNode from render.ts, render.ts imports from dispatch.ts
setMountNode((node: HellaNode) => mountNode(node) as Node);

/**
 * Mounts a HellaNode to a DOM element, replacing all existing content.
 * Supports async component functions — the container mounts the resolved node when the Promise settles.
 * @param node The HellaNode or component function to mount (sync or async)
 * @param target CSS selector string or Element to mount into (defaults to "#app")
 * @returns A MountHandle for controlling the mounted tree
 */
export function mount(
  node: HellaNode | (() => HellaNode) | (() => Promise<HellaNode | (() => HellaNode)>),
  target: string | Element = "#app"
): MountHandle {
  const container = typeof target === "string" ? document.querySelector(target) : target;
  if (!container) throw new Error(`[dom] mount: target "${target}" not found in document`);

  let mountedNode: HellaElement | null = null;
  let attached = false;
  let cancelled = false;

  const flush = () => {
    if (!attached) return;
    if (container.hasChildNodes()) {
      const children = container.childNodes;
      let i = 0;
      const len = children.length;
      while (i < len)
        mountQueue.add(children[i++]!);
    }
    processMountQueue();
    processCleanupQueue();
  };

  const unmount = () => {
    if (!attached) {
      cancelled = true;
      return;
    }
    if (mountedNode) {
      cleanupSubtree(mountedNode);
      if (mountedNode.parentNode) mountedNode.remove();
    }
  };

  const attach = (resolvedNode: HellaNode | (() => HellaNode)) => {
    if (cancelled) return;
    const node = resolveValue(resolvedNode) as HellaNode;
    mountedNode = mountNode(node) as HellaElement;
    container.replaceChildren(mountedNode);
    registerContainer(container);
    if (mountedNode.nodeType === Node.ELEMENT_NODE) {
      getState(mountedNode).isMounted = true;
    }
    attached = true;
  };

  const resolved = resolveValue(node);

  if (
    resolved !== null &&
    typeof resolved === "object" &&
    typeof (resolved as { then?: unknown }).then === "function") {
    (resolved as Promise<HellaNode | (() => HellaNode)>).then(attach, (err: unknown) => {
      dispatchError(toError(err), { phase: "mount" });
    });
    return { container, flush, unmount };
  }

  attach(resolved as HellaNode | (() => HellaNode));
  return { container, flush, unmount };
}