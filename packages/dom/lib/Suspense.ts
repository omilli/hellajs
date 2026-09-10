import { isFunction } from "./internal/core";
import { resolveNode, clearRenderedNodes, childNamespaceOf } from "./internal/render";
import { cleanupSubtree } from "./internal/cleanup";
import { peekHydrateContext, hydrateSequence } from "./internal/hydrate";
import { dispatchError, toError, resolveErrorConfig } from "./internal/dispatch";
import { getState } from "./internal/state";
import type { SuspenseProps, HellaElement, HellaChild } from "./types/nodes";

/**
 * Suspends `value` into `parent` before `anchor`: a thenable keeps the current fallback (removed via
 * `clearFallback` on settle) and swaps the resolved content in; a sync value replaces the fallback
 * immediately. Rejections bubble to the nearest boundary (`resolveErrorConfig`). Shared by the
 * fresh-mount and hydrate-degradation paths. Registers `suspenseCleanup` on the **anchor** and
 * tracks every inserted node, so an anchor teardown (reactive switch-away, region re-run, subtree
 * removal) cancels a pending child and removes the suspended content.
 */
function suspendChild(
  parent: Element,
  anchor: Node,
  value: HellaChild | HellaChild[],
  clearFallback: () => void
): void {
  const ns = childNamespaceOf(parent);
  const renderedNodes: Node[] = [];
  let cancelled = false;
  getState(anchor).suspenseCleanup = () => {
    cancelled = true;
    clearFallback();
    let i = 0;
    const len = renderedNodes.length;
    while (i < len) {
      const node = renderedNodes[i++]!;
      cleanupSubtree(node);
      node.parentNode?.removeChild(node);
    }
    renderedNodes.length = 0;
  };
  /** Inserts `node` before the anchor, tracking each top-level child (a fragment drains and tracks its children — the husk is empty after insertion). */
  const insertTracked = (node: Node): void => {
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      let f: ChildNode | null = (node as DocumentFragment).firstChild;
      while (f) {
        renderedNodes.push(f);
        parent.insertBefore(f, anchor);
        f = node.firstChild;
      }
      return;
    }
    renderedNodes.push(node);
    parent.insertBefore(node, anchor);
  };
  if (value && isFunction((value as Promise<unknown>).then)) {
    (value as Promise<HellaChild | HellaChild[]>)
      .then((resolved) => {
        if (cancelled || !anchor.parentNode) return;
        clearFallback();
        insertTracked(resolveNode(resolved, undefined, ns));
      })
      .catch((err: unknown) => {
        if (cancelled || !anchor.parentNode) return;
        clearFallback();
        const errNode = dispatchError(toError(err), { phase: "mount", element: parent as HellaElement, config: resolveErrorConfig(parent) });
        if (errNode) insertTracked(resolveNode(errNode, undefined, ns));
      });
    return;
  }
  clearFallback();
  insertTracked(resolveNode(value, undefined, ns));
}

/**
 * A streaming + async boundary. On the server, wrap async data in `<Suspense>` so the
 * shell and `fallback` flush immediately via [`ssr.stream`](/@hellajs/ssr) while the children resolve, then
 * [`hydrate`](./hydrate) swaps the resolved children in. Under [`ssr`](/@hellajs/ssr)/[`ssr.async`](/@hellajs/ssr)
 * (no streaming) it renders its children directly. Follows the ForEach/Lazy pattern using `isDynamic: true`.
 * @param props `{ fallback, children }`
 * @returns Function that mounts the boundary into a parent element
 */
export function Suspense(props: SuspenseProps): JSX.Element {
  const fn = ((parent: Element) => {
    const hctx = peekHydrateContext();
    if (hctx) {
      if (hctx.stageMissing) {
        // interrupted stream: the staged <template> never arrived — degrade to fresh-mount semantics
        console.warn("[dom] hydrate: suspense stage missing - re-suspending on client");
        const child = Array.isArray(props.children) && props.children.length === 1 ? props.children[0] : props.children;
        const value = isFunction(child) ? (child as () => HellaChild | HellaChild[])() : child;
        // the gathered region nodes ARE the rendered fallback — removed once the child settles
        suspendChild(parent, hctx.anchor, value, () => clearRenderedNodes(hctx.existingNodes, parent));
        return;
      }
      // hydrate: existingNodes holds the (swapped) resolved children; hydrate each child against them.
      // JSX/html compile component children to an array — pass it flat so hydrateSequence binds each.
      const children = Array.isArray(props.children) ? props.children : [props.children];
      hydrateSequence(parent as unknown as HellaElement, children, hctx.existingNodes[0] ?? null, undefined);
      return;
    }
    // fresh mount: resolve children once. A thenable child suspends — render the
    // fallback, await, then swap the resolved content in before the anchor (mirrors
    // Lazy). On rejection the error bubbles to the nearest error boundary; the
    // fallback is pending-only and is removed once the suspense resolves.
    const anchor = document.createTextNode("");
    parent.appendChild(anchor);
    // JSX wraps a single child in an array (`children: [child]`); `html`` passes it single.
    // Unwrap a length-1 array so an async producer is evaluated, not stringified by resolveNode.
    const child = Array.isArray(props.children) && props.children.length === 1 ? props.children[0] : props.children;
    const value = isFunction(child) ? (child as () => HellaChild | HellaChild[])() : child;
    let fallbackNode: Node | null = null;
    const clearFallback = () => {
      if (fallbackNode?.parentNode) fallbackNode.parentNode.removeChild(fallbackNode);
    };
    if (value && isFunction((value as Promise<unknown>).then) && props.fallback) {
      fallbackNode = resolveNode(props.fallback, undefined, childNamespaceOf(parent));
      anchor.parentNode?.insertBefore(fallbackNode, anchor);
    }
    suspendChild(parent, anchor, value, clearFallback);
  }) as JSX.Element;

  fn.isDynamic = true;
  fn.ssr = { kind: "suspense", props };
  return fn;
}
