import { resolveValue } from "./internal/utils";
import { resolveNode } from "./mount";
import { registry } from "./registry";
import { getState } from "./internal/state";
import type { PortalProps, HellaChild } from "./types/nodes";

/**
 * Renders children to a different DOM location while maintaining lifecycle.
 * Uses boundary markers for cleanup tracking, similar to ForEach.
 * @param props Portal props with target selector, insert type, and children
 * @returns Function that mounts portal content
 */
export function Portal(props: PortalProps): JSX.Element {
  const { to, type = "append", children = [] } = props;
  const childNodes = Array.isArray(children) ? children : [children];

  const fn = ((parent: Element) => {
    const marker = document.createComment("portal");
    parent.appendChild(marker);

    let portalNodes: Node[] = [];

    registry.addEffect(marker, () => {
      const target = document.querySelector(to)!;

      let i = 0, len = portalNodes.length;
      while (i < len) {
        const node = portalNodes[i++]!;
        node.parentNode?.removeChild(node);
      }
      portalNodes = [];

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

      const methods: Record<string, keyof Element> = {
        prepend: "prepend",
        replace: "replaceChildren",
        before: "before",
        after: "after"
      };
      (target[methods[type] || "appendChild"] as (content: DocumentFragment) => void)(fragment);
    });

    getState(marker).portalCleanup = () => {
      let i = 0;
      const len = portalNodes.length;
      while (i < len) {
        const node = portalNodes[i++]!;
        node.parentNode?.removeChild(node);
      }
      portalNodes = [];
    };
  }) as JSX.Element;

  fn.isDynamic = true;
  return fn;
}
