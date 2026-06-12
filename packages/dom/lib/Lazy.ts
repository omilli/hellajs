import { isFunction } from "./internal/core";
import { getState } from "./internal/state";
import { mountNode, resolveNode } from "./internal/render";
import type { LazyProps, HellaNode } from "./types/nodes";

/**
 * Lazily loads and renders async components with optional loading and fallback states.
 * Follows the ForEach/Portal pattern using isDynamic: true flag.
 * Supports cancellation via AbortSignal when the parent element is removed during loading.
 * @param props Component props with loader, loading, fallback, and props for the loaded component
 * @returns Function that mounts the lazy component into a parent element
 */
export function Lazy(props: LazyProps): JSX.Element {
  const fn = ((parent: Element) => {
    const start = document.createComment("lazy-start");
    const end = document.createComment("lazy-end");
    parent.appendChild(start);
    parent.appendChild(end);

    let loadingNode: Node | null = null;
    if (props.loading) {
      loadingNode = resolveNode(props.loading);
      start.parentNode?.insertBefore(loadingNode, end);
    }

    let cancelled = false;
    const controller = new AbortController();

    const state = getState(parent);
    state.lazyCleanup = () => {
      cancelled = true;
      controller.abort();
    };

    props.loader({ signal: controller.signal })
      .then(component => {
        if (cancelled || !start.parentNode) return;
        if (loadingNode?.parentNode) loadingNode.parentNode.removeChild(loadingNode);
        const resolved = isFunction(component) ? component(props.props) : component;
        const mounted = mountNode(resolved as HellaNode);
        start.parentNode.insertBefore(mounted, end);
      })
      .catch(() => {
        if (cancelled || !start.parentNode) return;
        if (loadingNode?.parentNode) loadingNode.parentNode.removeChild(loadingNode);
        if (props.fallback) {
          const mounted = resolveNode(props.fallback);
          start.parentNode.insertBefore(mounted, end);
        }
      });
  }) as JSX.Element;

  fn.isDynamic = true;
  return fn;
}