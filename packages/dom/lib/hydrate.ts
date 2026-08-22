import type { HellaNode, HellaElement, MountHandle } from "./types/nodes";
import { resolveValue } from "./internal/utils";
import { dispatchError, toError } from "./internal/dispatch";
import { mountNode } from "./internal/render";
import { hydrateNode, hydrateSequence } from "./internal/hydrate";
import { registerContainer, processMountQueue, processCleanupQueue, mountQueue, beginMountPhase, endMountPhase } from "./internal/queue";
import { cleanupSubtree } from "./internal/cleanup";

/**
 * Hydrates server-rendered HTML in place — re-executes the component tree and
 * attaches effects, event handlers, and state to the EXISTING DOM, never
 * replacing it (unlike [`mount`](./mount), which calls `replaceChildren`).
 *
 * Pass the SAME node the server passed to [`ssr`](/@hellajs/ssr); the target
 * element's existing children must be that `ssr()` output. Reactive state must
 * initialize to the same values the server rendered (drift surfaces as a
 * mismatch). Element-bounded structure, keyed lists, and every marker-bounded
 * reactive region are adopted in place — the server bounds each dynamic region
 * in `<!--[-->…<!--]-->` markers the walker reads.
 * @param node A HellaNode or component function — the same tree passed to `ssr()`.
 * @param target CSS selector string or Element whose existing children are the server output. Defaults to `"#app"`.
 * @returns A [`MountHandle`](#mounthandle) with `flush()` and `unmount()` methods.
 * @throws {Error} When `target` is a selector string that matches no element in the document.
 */
export function hydrate(
  node: HellaNode | (() => HellaNode) | (() => Promise<HellaNode | (() => HellaNode)>),
  target: string | Element = "#app"
): MountHandle {
  const container = typeof target === "string" ? document.querySelector(target) : target;
  if (!container) throw new Error(`[dom] hydrate: target "${target}" not found in document`);

  let rootEl: HellaElement | null = null;
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
    if (rootEl) {
      cleanupSubtree(rootEl);
      if (rootEl.parentNode) rootEl.remove();
    }
  };

  const attach = (resolvedNode: HellaNode | (() => HellaNode)) => {
    if (cancelled) return;
    beginMountPhase();
    try {
      const n = resolveValue(resolvedNode) as HellaNode;
      if (!container.hasChildNodes()) {
        // nothing to hydrate — mount fresh
        rootEl = mountNode(n) as HellaElement;
        container.replaceChildren(rootEl);
      } else if (n.tag === "$") {
        // fragment root: hydrate each top-level child against the container's children
        hydrateSequence(container as unknown as HellaElement, n.children, container.firstChild, undefined);
      } else {
        rootEl = container.firstChild as HellaElement;
        hydrateNode(n, rootEl);
      }
      registerContainer(container);
      attached = true;
      flush();   // fire afterMount + set isMounted (root + descendants) now — hydrate adds no nodes, so the observer never would
    } finally {
      endMountPhase();
    }
  };

  const resolved = resolveValue(node);

  if (
    resolved !== null &&
    typeof resolved === "object" &&
    typeof (resolved as { then?: unknown }).then === "function"
  ) {
    (resolved as Promise<HellaNode | (() => HellaNode)>).then(attach, (err: unknown) => {
      dispatchError(toError(err), { phase: "mount" });
    });
    return { container, flush, unmount };
  }

  attach(resolved as HellaNode | (() => HellaNode));
  return { container, flush, unmount };
}
