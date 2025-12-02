import { isFunction } from "./internal/utils";
import { resolveNode } from "./mount";
import { registry } from "./registry";
import type { PortalProps, HellaPortal, HellaElement, PortalInsertType, HellaChild } from "./types/nodes.d.ts";

/**
 * Renders children to a different DOM location while maintaining lifecycle.
 * Uses boundary markers for cleanup tracking, similar to ForEach.
 * @param props Portal props with target selector, insert type, and children
 * @returns Function that mounts portal content
 */
export function Portal(props: PortalProps): HellaPortal {
  const { to, type = "append" } = props;
  // Normalize children: ensure it's always an array (html`` unwraps single children)
  const children = props.children
    ? Array.isArray(props.children) ? props.children : [props.children]
    : [];

  const fn = (parent: Element) => {
    const marker = document.createComment("portal") as unknown as HellaElement;
    parent.appendChild(marker);

    let portalNodes: Node[] = [];

    registry.addEffect(marker, () => {
      const target = document.querySelector(to);

      if (!target) {
        console.warn(`[hella] Portal target "${to}" not found`);
        return;
      }

      // Clean previous portal content
      let i = 0, len = portalNodes.length;
      while (i < len) portalNodes[i++].parentNode?.removeChild(portalNodes[i - 1]);
      portalNodes = [];

      // Render children and collect nodes
      const fragment = document.createDocumentFragment();
      i = 0;
      len = children.length;
      while (i < len) {
        const child = children[i++] as HellaChild;
        const resolved = isFunction(child) ? child() : child;
        const node = resolveNode(resolved, marker);
        portalNodes.push(node);
        fragment.appendChild(node);
      }

      insertPortalContent(target, fragment, type);
    });

    marker.__hella_portal_cleanup = () => {
      let i = 0, len = portalNodes.length;
      while (i < len) portalNodes[i++].parentNode?.removeChild(portalNodes[i - 1]);
      portalNodes = [];
    };
  };

  fn.isPortal = true;
  return fn;
}

/**
 * Inserts portal content into target using specified method.
 */
function insertPortalContent(
  target: Element,
  content: DocumentFragment,
  type: PortalInsertType
) {
  switch (type) {
    case "prepend":
      target.prepend(content);
      break;
    case "replace":
      target.replaceChildren(content);
      break;
    case "before":
      target.before(content);
      break;
    case "after":
      target.after(content);
      break;
    default:
      target.appendChild(content);
  }
}
