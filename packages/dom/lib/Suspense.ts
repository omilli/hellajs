import { isFunction } from "./internal/core";
import { resolveNode } from "./internal/render";
import { peekHydrateContext, hydrateSequence } from "./internal/hydrate";
import { dispatchError, toError, resolveErrorConfig } from "./internal/dispatch";
import { getState } from "./internal/state";
import type { SuspenseProps, HellaElement, HellaChild } from "./types/nodes";

/**
 * A streaming + async boundary. On the server, wrap async data in `<Suspense>` so the
 * shell and `fallback` flush immediately via [`ssrStream`](/@hellajs/ssr) while the children resolve, then
 * [`hydrate`](./hydrate) swaps the resolved children in. Under [`ssr`](/@hellajs/ssr)/[`ssrAsync`](/@hellajs/ssr)
 * (no streaming) it renders its children directly. Follows the ForEach/Lazy pattern using `isDynamic: true`.
 * @param props `{ fallback, children }`
 * @returns Function that mounts the boundary into a parent element
 */
export function Suspense(props: SuspenseProps): JSX.Element {
  const fn = ((parent: Element) => {
    const hctx = peekHydrateContext();
    if (hctx) {
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
    if (value && typeof (value as Promise<unknown>).then === "function") {
      let fallbackNode: Node | null = null;
      if (props.fallback) {
        fallbackNode = resolveNode(props.fallback);
        anchor.parentNode?.insertBefore(fallbackNode, anchor);
      }
      let cancelled = false;
      getState(parent).suspenseCleanup = () => { cancelled = true; };
      (value as Promise<HellaChild | HellaChild[]>)
        .then((resolved) => {
          if (cancelled || !anchor.parentNode) return;
          if (fallbackNode?.parentNode) fallbackNode.parentNode.removeChild(fallbackNode);
          parent.insertBefore(resolveNode(resolved), anchor);
        })
        .catch((err: unknown) => {
          if (cancelled || !anchor.parentNode) return;
          if (fallbackNode?.parentNode) fallbackNode.parentNode.removeChild(fallbackNode);
          const errNode = dispatchError(toError(err), { phase: "mount", element: parent, config: resolveErrorConfig(parent) });
          if (errNode) anchor.parentNode?.insertBefore(resolveNode(errNode), anchor);
        });
      return;
    }
    parent.insertBefore(resolveNode(value), anchor);
  }) as JSX.Element;

  fn.isDynamic = true;
  fn.ssr = { kind: "suspense", props };
  return fn;
}
