import type { MountHandle } from "../types/nodes";
import type { TemplateBuildFn } from "../runtime";
import { isFunction, isObject } from "./core";
import { isTemplateBuild } from "./utils";
import { dispatchError, toError } from "./dispatch";
import {
  queueMountNode,
  drainMountQueue,
  processCleanupQueue,
  beginMountPhase,
  endMountPhase,
} from "./queue";
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
 * @param node The flagged build fn (or wrapper fn) passed to `mount`/`hydrate`.
 * @param attachImpl Renders the resolved node into the container; runs inside the mount phase, before the first `flush()`. Returns the root nodes for `unmount()`.
 * @param afterFlush Runs after the first `flush()`, still inside the mount phase — hydrate's deferred-region watch.
 * @returns The MountHandle for the mounted tree.
 */
export function createMountHandle(
  container: Element | ShadowRoot,
  node:
    | TemplateBuildFn
    | (() => TemplateBuildFn)
    | (() => Promise<TemplateBuildFn | (() => TemplateBuildFn)>),
  attachImpl: (resolvedNode: TemplateBuildFn) => Node[],
  afterFlush?: () => void,
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
      while (i < len) queueMountNode(children[i++]!);
    }
    drainMountQueue();
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

  const attach = (resolvedNode: TemplateBuildFn) => {
    if (cancelled) return;
    beginMountPhase();
    try {
      mountedNodes = attachImpl(resolvedNode);
      attached = true;
      flush(); // fire afterMount + set isMounted (root + descendants) now — the scoped observer misses the initial attach (hydrate adds no nodes, so it never would)
      afterFlush?.();
    } finally {
      endMountPhase();
    }
  };

  // Unwrap ONE sync wrapper level, stopping at flagged builds: the build fn is the mount
  // input and must reach `attachImpl` un-invoked — the attach path invokes it exactly once
  // through `resolveNode`'s flagged branch (build frame + componentScope wiring). Invoking
  // here would construct outside the frame and strip the scope wiring.
  const resolved = isFunction(node) && !isTemplateBuild(node) ? (node as () => unknown)() : node;

  if (isObject(resolved) && isFunction((resolved as { then?: unknown }).then)) {
    (resolved as Promise<TemplateBuildFn | (() => TemplateBuildFn)>).then(
      // The async value may carry one more sync-wrapper level — same gated unwrap as above.
      (value) => attach(isTemplateBuild(value) ? value : (value as () => TemplateBuildFn)()),
      (err: unknown) => {
        dispatchError(toError(err), { phase: "mount" });
      },
    );
    return { container, flush, unmount };
  }

  attach(resolved as TemplateBuildFn);
  return { container, flush, unmount };
}
