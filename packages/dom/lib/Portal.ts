import { resolveNode, childNamespaceOf } from "./internal/render";
import { registry } from "./registry";
import { getState } from "./internal/state";
import { peekHydrateContext } from "./internal/hydrate";
import type { PortalProps, HellaChild } from "./types/nodes";

const INSERT_METHODS: Record<string, keyof Element> = {
  prepend: "prepend",
  replace: "replaceChildren",
  before: "before",
  after: "after",
  append: "appendChild"
};

/**
 * Renders children to a different DOM location while maintaining lifecycle.
 * Uses boundary markers for cleanup tracking, similar to ForEach.
 * @param props Portal props with target selector, insert type, and children
 * @returns Function that mounts portal content
 * @throws {Error} When the target selector matches no element in the document (checked at first effect run, not at construction).
 */
export function Portal(props: PortalProps): JSX.Element {
  const { to, type = "append", children = [] } = props;
  const childNodes = Array.isArray(children) ? children : [children];

  const fn = ((parent: Element) => {
    const hctx = peekHydrateContext();
    const anchor = hctx ? hctx.anchor : document.createTextNode("");
    if (!hctx) parent.appendChild(anchor);

    let portalNodes: Node[] = [];

    registry.addEffect(anchor, () => {
      if (portalNodes.length > 0) return;

      const target = document.querySelector(to);
      if (!target) throw new Error(`[dom] Portal: target "${to}" not found in document`);
      const ns = childNamespaceOf(target);

      const fragment = document.createDocumentFragment();
      let i = 0;
      const len = childNodes.length;
      while (i < len) {
        const child = childNodes[i++] as HellaChild;
        const node = resolveNode(child, anchor, ns);
        portalNodes.push(node);
        fragment.appendChild(node);
      }

      (target[INSERT_METHODS[type] || "appendChild"] as (content: DocumentFragment) => void)(fragment);
    });

    getState(anchor).portalCleanup = () => {
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
  fn.ssr = { kind: "portal", props };
  return fn;
}
