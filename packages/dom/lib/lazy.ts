import { isFunction } from "./internal/core";
import { mountNode, resolveNode } from "./mount";
import type { LazyProps } from "./types/nodes.d.ts";

/**
 * Lazily loads and renders async components with optional fallback.
 * Follows the ForEach/Portal pattern using isDynamic: true flag.
 * @param props Component props with loader, fallback, and props for the loaded component
 * @returns Function that mounts the lazy component into a parent element
 */
export function Lazy(props: LazyProps): JSX.Element {
  const fn = ((parent: Element) => {
    // Create boundary markers like ForEach/Portal
    const start = document.createComment("lazy-start");
    const end = document.createComment("lazy-end");
    parent.appendChild(start);
    parent.appendChild(end);

    // Load and render component
    props.loader()
      .then(component => {
        const resolved = isFunction(component) ? component(props.props) : component;
        const mounted = mountNode(resolved as any);
        start.parentNode?.insertBefore(mounted, end);
      })
      .catch(() => {
        if (props.fallback) {
          const mounted = resolveNode(props.fallback as any);
          start.parentNode?.insertBefore(mounted, end);
        }
      });

    // Return a placeholder node that ForEach can manage
    const fragment = document.createDocumentFragment();
    return fragment;

  }) as unknown as JSX.Element;

  fn.isDynamic = true; // Critical for mount.ts integration
  return fn;
}