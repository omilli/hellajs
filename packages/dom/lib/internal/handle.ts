import type { HellaNode, MountHandle } from "../types/nodes";
import { isFunction, isObject } from "./core";
import { resolveValue } from "./utils";
import { dispatchError, toError } from "./dispatch";
import { processMountQueue, processCleanupQueue, mountQueue, beginMountPhase, endMountPhase } from "./queue";
import { cleanupSubtree } from "./cleanup";

/**
 * @internal
 * Builds the `mount`/`hydrate` handle — owns the attached/cancelled/roots closure state,
 * the `flush`/`unmount` closures, and the resolve/thenable dispatch. A thenable node
 * defers `attachImpl` via `.then` (rejections route through `dispatchError` with phase
 * "mount"); anything else attaches synchronously. `attachImpl` renders the resolved node
 * into the container inside the mount phase and returns the root nodes to unmount —
 * the container's root set, so a fragment root's every spread child unmounts.
 * @param container The resolved mount target.
 * @param node The HellaNode or component function passed to `mount`/`hydrate`.
 * @param attachImpl Renders the resolved node into the container; runs inside the mount phase, before the first `flush()`. Returns the root nodes for `unmount()`.
 * @param afterFlush Runs after the first `flush()`, still inside the mount phase — hydrate's deferred-region watch.
 * @returns The MountHandle for the mounted tree.
 */
export function createMountHandle(
  container: Element | ShadowRoot,
  node: HellaNode | (() => HellaNode) | (() => Promise<HellaNode | (() => HellaNode)>),
  attachImpl: (resolvedNode: HellaNode | (() => HellaNode)) => Node[],
  afterFlush?: () => void
): MountHandle {
  let mountedNodes: Node[] = [];
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
    let i = 0;
    const len = mountedNodes.length;
    while (i < len) {
      const n = mountedNodes[i]!;
      cleanupSubtree(n);
      n.parentNode?.removeChild(n);
      i++;
    }
  };

  const attach = (resolvedNode: HellaNode | (() => HellaNode)) => {
    if (cancelled) return;
    beginMountPhase();
    try {
      mountedNodes = attachImpl(resolvedNode);
      attached = true;
      flush();   // fire afterMount + set isMounted (root + descendants) now — the scoped observer misses the initial attach (hydrate adds no nodes, so it never would)
      afterFlush?.();
    } finally {
      endMountPhase();
    }
  };

  const resolved = resolveValue(node);

  if (
    isObject(resolved) &&
    isFunction((resolved as { then?: unknown }).then)) {
    (resolved as Promise<HellaNode | (() => HellaNode)>).then(attach, (err: unknown) => {
      dispatchError(toError(err), { phase: "mount" });
    });
    return { container, flush, unmount };
  }

  attach(resolved as HellaNode | (() => HellaNode));
  return { container, flush, unmount };
}
