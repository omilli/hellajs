import { isFunction } from "./internal/core";
import { resolveValue } from "./internal/utils";
import { resolveNode } from "./mount";
import { registry } from "./registry";
import type { PortalProps, AugmentedElement, HellaChild } from "./types/nodes.d.ts";

/**
 * Renders children to a different DOM location while maintaining lifecycle.
 * Uses boundary markers for cleanup tracking, similar to ForEach.
 * @param props Portal props with target selector, insert type, and children
 * @returns Function that mounts portal content
 */
export function Portal(props: PortalProps): JSX.Element {
  const { to, type = "append", children = [] } = props;
  // Normalize children: ensure it's always an array (html`` unwraps single children)
  const childNodes = Array.isArray(children) ? children : [children]

  const fn = ((parent: Element) => {
    const marker = document.createComment("portal") as unknown as AugmentedElement;
    parent.appendChild(marker);

    let portalNodes: Node[] = [];

    registry.addEffect(marker, () => {
      const target = document.querySelector(to)!;

      // Clean previous portal content
      let i = 0, len = portalNodes.length;
      while (i < len) portalNodes[i++].parentNode?.removeChild(portalNodes[i - 1]);
      portalNodes = [];

      // Render children and collect nodes
      const fragment = document.createDocumentFragment();
      i = 0;
      len = childNodes.length;
      while (i < len) {
        const child = childNodes[i++] as HellaChild;
        const resolved = resolveValue(child);
        const node = resolveNode(resolved, marker);
        portalNodes.push(node);
        fragment.appendChild(node);
      }

      // Insert portal content using dynamic method lookup
      const methods: Record<string, keyof Element> = {
        prepend: "prepend",
        replace: "replaceChildren",
        before: "before",
        after: "after"
      };
      (target[methods[type] || "appendChild"] as (content: DocumentFragment) => void)(fragment);
    });

    marker.__hella_portal_cleanup = () => {
      let i = 0, len = portalNodes.length;
      while (i < len)
        portalNodes[i++].parentNode?.removeChild(portalNodes[i - 1]);
      portalNodes = [];
    };
  }) as JSX.Element;

  fn.isDynamic = true;
  return fn;
}
