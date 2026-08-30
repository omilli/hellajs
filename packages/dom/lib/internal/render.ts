import type { HellaNode, HellaChild, HellaElement, RenderFn, ErrorConfig, ElementMountFn } from "../types/nodes";
import { isFunction, objectLoop } from "./core";
import { renderProp, toText, resolveValue } from "./utils";
import { setNodeHandler, setDirectHandler } from "./events";
import { dispatchError, toError } from "./dispatch";
import { registry } from "../registry";
import { cleanupSubtree } from "./cleanup";
import { getState, peekState } from "./state";

let staticDom = new WeakMap<HellaNode, Element | DocumentFragment>();

const SVG_NS = "http://www.w3.org/2000/svg";
const MATHML_NS = "http://www.w3.org/1998/Math/MathML";

/**
 * @internal
 * The HTML namespace URI — elements outside it (SVG, MathML) keep authored tag case.
 */
export const HTML_NS = "http://www.w3.org/1999/xhtml";

/**
 * @internal
 * Derives the creation namespace for children of `parent`: the parent's own namespace when it is
 * a foreign (SVG/MathML) element; `undefined` for HTML parents, fragments, text anchors, and
 * `foreignObject` (an HTML integration point inside SVG — its children reset to HTML).
 * @param parent The node whose children are being created
 * @returns The namespace URI to create children in, or undefined for HTML
 */
export function childNamespaceOf(parent: Node | null): string | undefined {
  if (!parent) return undefined;
  const element = parent as Element;
  if (element.localName === "foreignObject") return undefined;
  const ns = element.namespaceURI;
  return ns && ns !== HTML_NS ? ns : undefined;
}

/**
 * @internal
 * Clears the `staticDom` prototype cache — the next mount of each `static` subtree rebuilds
 * a fresh prototype. Wired into `resetDom()` for test isolation.
 */
export function clearStaticCache(): void {
  staticDom = new WeakMap();
}

/**
 * @internal
 * Gets the error boundary config for an element.
 * @param boundary The boundary element to check
 * @returns The error config, or undefined
 */
export function getBoundaryConfig(boundary: Element | undefined): ErrorConfig | undefined {
  if (!boundary) return undefined;
  const state = peekState(boundary);
  return state ? state.errorConfig : undefined;
}

/**
 * @internal
 * Clears a tracked rendered-nodes array, cleaning up each node before removal.
 * @param nodes The array of rendered nodes to clear
 * @param parent The parent DOM node to remove children from
 */
export function clearRenderedNodes(nodes: Node[], parent: Node) {
  let i = 0;
  const len = nodes.length;
  while (i < len) {
    const n = nodes[i++]!;
    cleanupSubtree(n);
    parent.removeChild(n);
  }
  nodes.length = 0;
}

/**
 * Parses a raw HTML string into a fragment for insertion.
 */
function rawToFragment(html: string): DocumentFragment {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  return tpl.content;
}

/**
 * @internal
 * Resolves a HellaChild to a DOM Node with reactive support. A `HellaChild[]` (JSX and `html\`\``
 * compile component children to an array) mounts each child into a `DocumentFragment`, mirroring the
 * ssr `walkChildren` array branch.
 * @param value The value to resolve (HellaChild, array of children, function, or primitive)
 * @param parent Optional parent element for effect registration
 * @param ns Optional namespace URI forwarded to `mountNode` for HellaNode children
 * @returns The resolved DOM Node
 */
export function resolveNode(value: HellaChild | HellaChild[], parent?: Node, ns?: string): Node {
  if (Array.isArray(value)) {
    const fragment = document.createDocumentFragment();
    let i = 0;
    const len = value.length;
    while (i < len) {
      fragment.appendChild(resolveNode(value[i]!, parent, ns));
      i++;
    }
    return fragment;
  }
  if (value !== null && typeof value === "object") {
    // HellaNode first — the common object child; DOM Nodes expose tagName, never tag
    if ((value as HellaNode).tag !== undefined) return mountNode(value as HellaNode, undefined, ns);
    if ("raw" in value) return rawToFragment((value as { raw: string }).raw);
  }
  if (isFunction(value)) {
    const textNode = document.createTextNode("");
    registry.addEffect(parent || textNode, () =>
      textNode.textContent = toText(value())
    );
    return textNode;
  }
  return document.createTextNode(toText(value));
}

/**
 * @internal
 * Mounts a HellaNode to a DOM element or fragment with all properties and lifecycle hooks.
 * A `svg` root always creates in the SVG namespace and a `math` root in MathML; other tags
 * inherit `ns` when mounted under a foreign-namespace parent.
 * @param node The HellaNode to mount
 * @param boundaryElement The nearest error boundary element (for error propagation during construction)
 * @param ns Optional namespace URI inherited from the insertion parent
 * @returns The mounted DOM element or fragment
 */
export function mountNode(node: HellaNode, boundaryElement?: Element, ns?: string): HellaElement | DocumentFragment {
  if (node.static) {
    const cached = staticDom.get(node);
    if (cached) return cached.cloneNode(true) as HellaElement | DocumentFragment;
  }

  const { tag, props, on, e, hooks, children, componentScope, error } = node;

  if (tag === "$") {
    const fragment = document.createDocumentFragment();
    appendToParent(fragment as unknown as HellaElement, children, boundaryElement, ns);
    if (node.static) staticDom.set(node, fragment);
    return fragment;
  }

  let element: HellaElement;
  if (tag === "svg") {
    element = document.createElementNS(SVG_NS, tag as string) as HellaElement;
  } else if (tag === "math") {
    element = document.createElementNS(MATHML_NS, tag as string) as HellaElement;
  } else {
    element = (ns ? document.createElementNS(ns, tag as string) : document.createElement(tag as string)) as HellaElement;
  }

  if (componentScope || error) {
    const state = getState(element);
    if (componentScope) state.componentScope = componentScope;
    if (error) {
      state.errorConfig = error;
      state.originalNode = node;
    }
  }

  const currentBoundary = error ? element : boundaryElement;

  if (hooks) {
    hooks.beforeMount && registry.addHook(element, "beforeMount", hooks.beforeMount);
    hooks.afterMount && registry.addHook(element, "afterMount", hooks.afterMount as ElementMountFn);
    hooks.beforeDestroy && registry.addHook(element, "beforeDestroy", hooks.beforeDestroy as ElementMountFn);
    hooks.afterDestroy && registry.addHook(element, "afterDestroy", hooks.afterDestroy);
    hooks.beforeUpdate && registry.addHook(element, "beforeUpdate", hooks.beforeUpdate as ElementMountFn);
    hooks.afterUpdate && registry.addHook(element, "afterUpdate", hooks.afterUpdate as ElementMountFn);

    if (hooks.beforeMount) {
      try {
        hooks.beforeMount();
      } catch (err) {
        const config = getBoundaryConfig(currentBoundary);
        dispatchError(toError(err), { phase: "mount", element, config });
      }
    }
  }

  objectLoop(props, (key, value) => {
    if (!isFunction(value)) {
      renderProp(element, key, value);
      return;
    }
    registry.addEffect(element, () => {
      try {
        renderProp(element, key, value());
      } catch (err) {
        const config = getBoundaryConfig(currentBoundary);
        const fallback = dispatchError(toError(err), { phase: "update", element, config });
        if (fallback) {
          const target = currentBoundary ?? element;
          target.replaceChildren(mountNode(fallback));
        }
      }
    });
  });

  objectLoop(on, (eventName, handler) =>
    setNodeHandler(element, eventName, handler as EventListener)
  );

  if (e) {
    objectLoop(e, (eventName, handler) =>
      setDirectHandler(element, eventName, handler as EventListener)
    );
  }

  appendToParent(element, children, currentBoundary);

  if (node.static) staticDom.set(node, element);
  return element;
}

/**
 * Appends children to a parent element with reactive support.
 * Handles static text, HellaNodes, functions, and forEach.
 * @param parent The parent element
 * @param children The children to append
 * @param currentBoundary The nearest error boundary element (for error propagation during construction)
 * @param ns Namespace inherited from the insertion context — used when `parent` is a DocumentFragment
 */
function appendToParent(parent: HellaElement, children?: HellaChild[], currentBoundary?: Element, ns?: string) {
  if (!children || children.length === 0) return;

  if (children.length === 1 && typeof children[0] === "string") {
    parent.textContent = children[0];
    return;
  }

  // Elements self-derive the child namespace; fragments carry the insertion context's ns
  const childNs = parent.nodeType === Node.ELEMENT_NODE ? childNamespaceOf(parent) : ns;

  let index = 0;
  const length = children.length;
  while (index < length) {
    const child = children[index];
    index++;

    if (typeof child === "string") {
      parent.appendChild(document.createTextNode(child));
      continue;
    }

    if (isFunction(child)) {
      if ((child as RenderFn).isDynamic) {
        child(parent);
        continue;
      }

      const anchor = document.createTextNode("");
      parent.appendChild(anchor);

      const renderedNodes: Node[] = [];

      registry.addEffect(parent, () => {
        const actualParent = anchor.parentNode as HellaElement;
        if (!actualParent) return;

        try {
          const resolved = resolveValue(child);

          clearRenderedNodes(renderedNodes, actualParent);

          if (isFunction(resolved) && (resolved as RenderFn).isDynamic) {
            const proxyParent = new Proxy(actualParent as Element, {
              get(target, prop) {
                if (prop === "appendChild") {
                  return (node: Node) => {
                    renderedNodes.push(node);
                    return target.insertBefore(node, anchor);
                  };
                }
                const val = (target as unknown as Record<string, unknown>)[prop as string];
                return typeof val === "function" ? (val as (...args: unknown[]) => unknown).bind(target) : val;
              }
            });
            (resolved as RenderFn)(proxyParent as HellaElement);
            return;
          }

          const newNode = resolveNode(resolved as HellaChild, parent, childNs);

          if (newNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            let fragChild: ChildNode | null;
            while ((fragChild = newNode.firstChild)) {
              renderedNodes.push(fragChild);
              actualParent.insertBefore(fragChild, anchor);
            }
          } else {
            renderedNodes.push(newNode);
            actualParent.insertBefore(newNode, anchor);
          }
        } catch (e) {
          const config = getBoundaryConfig(currentBoundary);
          const fallback = dispatchError(toError(e), { phase: "mount", element: actualParent, config });
          if (fallback) {
            clearRenderedNodes(renderedNodes, actualParent);

            const fbNode = mountNode(fallback);
            renderedNodes.push(fbNode);
            actualParent.insertBefore(fbNode, anchor);
          }
        }
      });

      continue;
    }

    if (child !== null && typeof child === "object") {
      // HellaNode first — the common object child; raw sentinels and DOM Nodes never carry tag
      if ((child as HellaNode).tag !== undefined) {
        parent.appendChild(mountNode(child as HellaNode, currentBoundary, childNs));
      } else if ("raw" in child) {
        parent.appendChild(rawToFragment((child as { raw: string }).raw));
      } else if (child instanceof Node) {
        parent.appendChild(child);
      }
      continue;
    }

    if (typeof child === "number") {
      parent.appendChild(document.createTextNode(String(child)));
    }
    // booleans, null, undefined render nothing
  }
}
