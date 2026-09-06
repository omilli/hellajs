import type { HellaNode, HellaElement, MountHandle } from "./types/nodes";
import { isString } from "./internal/core";
import { resolveValue, wireFragmentScope } from "./internal/utils";
import { mountNode } from "./internal/render";
import { hydrateNode, hydrateSequence } from "./internal/hydrate";
import { hasDeferredRegions, startDeferredRegionWatch } from "./internal/deferred";
import { registerContainer } from "./internal/queue";
import { createMountHandle } from "./internal/handle";

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
 * @throws {Error} When target is a selector string that matches no element in the document.
 */
export function hydrate(
  node: HellaNode | (() => HellaNode) | (() => Promise<HellaNode | (() => HellaNode)>),
  target: string | Element = "#app"
): MountHandle {
  const container = isString(target) ? document.querySelector(target) : target;
  if (!container) throw new Error(`[dom] hydrate: target "${target}" not found in document`);

  return createMountHandle(
    container,
    node,
    (resolvedNode) => {
      const n = resolveValue(resolvedNode) as HellaNode;
      let rootEl: HellaElement | null = null;
      if (!container.hasChildNodes()) {
        // nothing to hydrate — mount fresh
        rootEl = mountNode(n) as HellaElement;
        container.replaceChildren(rootEl);
      } else if (n.tag === "$") {
        // fragment root: hydrate each top-level child against the container's children.
        // ssr emits no root-level markers, so the scope rides the first surviving server
        // node (empty container never reaches this branch — fresh-mount path wires it).
        if (n.componentScope) wireFragmentScope(container.firstChild, null, n.componentScope);
        hydrateSequence(container as unknown as HellaElement, n.children, container.firstChild, undefined);
      } else {
        rootEl = container.firstChild as HellaElement;
        hydrateNode(n, rootEl);
      }
      registerContainer(container);
      return rootEl;
    },
    () => {
      if (hasDeferredRegions()) startDeferredRegionWatch(container);   // selective hydration: watch for late <Suspense> stages + replay events
    }
  );
}
