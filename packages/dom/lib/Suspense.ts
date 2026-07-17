import { resolveNode } from "./internal/render";
import { peekHydrateContext, hydrateSequence } from "./internal/hydrate";
import type { SuspenseProps, HellaElement } from "./types/nodes";

/**
 * An out-of-order streaming boundary for server rendering. Wrap async server data in `<Suspense>` so the
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
      // hydrate: existingNodes holds the (swapped) resolved children; hydrate props.children against them
      hydrateSequence(parent as unknown as HellaElement, [props.children], hctx.existingNodes[0] ?? null, undefined);
      return;
    }
    // fresh mount: render children directly (fallback is server-stream-only)
    const anchor = document.createTextNode("");
    parent.appendChild(anchor);
    const node = resolveNode(props.children);
    parent.insertBefore(node, anchor);
  }) as JSX.Element;

  fn.isDynamic = true;
  fn.ssr = { kind: "suspense", props };
  return fn;
}
