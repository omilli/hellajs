import { isFunction } from "./internal/core";
import { getState } from "./internal/state";
import { mountNode, resolveNode } from "./internal/render";
import { peekHydrateContext } from "./internal/hydrate";
import type { LazyProps, HellaNode } from "./types/nodes";

/**
 * Lazily loads and renders async components with optional loading and fallback states.
 * Follows the ForEach/Portal pattern using isDynamic: true flag.
 * Supports cancellation via AbortSignal when the parent element is removed during loading.
 * @param props Component props with loader, loading, fallback, and props for the loaded component
 * @returns Function that mounts the lazy component into a parent element
 * @throws {Error} When props.loader is not a function.
 */
export function Lazy(props: LazyProps): JSX.Element {
  if (typeof props.loader !== "function") throw new Error("[dom] Lazy: loader must be a function");
  const fn = ((parent: Element) => {
    const hctx = peekHydrateContext();
    const anchor = hctx ? hctx.anchor : document.createTextNode("");
    if (!hctx) parent.appendChild(anchor);

    let loadingNode: Node | null = null;
    if (props.loading) {
      loadingNode = resolveNode(props.loading);
      anchor.parentNode?.insertBefore(loadingNode, anchor);
    }

    let isCancelled = false;
    const controller = new AbortController();

    const state = getState(parent);
    state.lazyCleanup = () => {
      isCancelled = true;
      controller.abort();
    };

    props.loader({ signal: controller.signal })
      .then(component => {
        if (isCancelled || !anchor.parentNode) return;
        if (loadingNode?.parentNode) loadingNode.parentNode.removeChild(loadingNode);
        const resolved = isFunction(component) ? component(props.props) : component;
        const mounted = mountNode(resolved as HellaNode);
        anchor.parentNode.insertBefore(mounted, anchor);
      })
      .catch((err: unknown) => {
        if (isCancelled || !anchor.parentNode) return;
        if (loadingNode?.parentNode) loadingNode.parentNode.removeChild(loadingNode);
        if (props.fallback) {
          const mounted = resolveNode(props.fallback);
          anchor.parentNode.insertBefore(mounted, anchor);
        } else {
          console.error("[dom] Lazy:", err);
        }
      });
  }) as JSX.Element;

  fn.isDynamic = true;
  fn.ssr = { kind: "lazy", props };
  return fn;
}