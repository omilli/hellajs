import { isFunction } from "./internal/core";
import { mountNode, resolveNode } from "./mount";
import type { LazyProps, HellaNode } from "./types/nodes.d.ts";

/**
 * Lazily loads and renders async components with optional loading and fallback states.
 * Follows the ForEach/Portal pattern using isDynamic: true flag.
 * @param props Component props with loader, loading, fallback, and props for the loaded component
 * @returns Function that mounts the lazy component into a parent element
 */
export function Lazy(props: LazyProps): JSX.Element {
  const fn = ((parent: Element) => {
    // Create boundary markers like ForEach/Portal
    const start = document.createComment("lazy-start");
    const end = document.createComment("lazy-end");
    parent.appendChild(start);
    parent.appendChild(end);

    // Render loading state immediately if provided
    let loadingNode: Node | null = null;
    if (props.loading) {
      loadingNode = resolveNode(props.loading);
      start.parentNode?.insertBefore(loadingNode, end);
    }

    // Load and render component
    props.loader()
      .then(component => {
        // Remove loading state before rendering success
        if (loadingNode && loadingNode.parentNode) {
          loadingNode.parentNode.removeChild(loadingNode);
        }
        const resolved = isFunction(component) ? component(props.props) : component;
        const mounted = mountNode(resolved as HellaNode);
        start.parentNode?.insertBefore(mounted, end);
      })
      .catch(() => {
        // Remove loading state before rendering fallback
        if (loadingNode && loadingNode.parentNode) {
          loadingNode.parentNode.removeChild(loadingNode);
        }
        if (props.fallback) {
          const mounted = resolveNode(props.fallback);
          start.parentNode?.insertBefore(mounted, end);
        }
      });

  }) as unknown as JSX.Element;

  fn.isDynamic = true; // Critical for mount.ts integration
  return fn;
}