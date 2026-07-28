import type { HellaNode, HellaChild, HellaElement, RenderFn, ErrorConfig, ElementMountFn } from "../types/nodes";
import { isFunction, objectLoop } from "./core";
import { renderProp, toText, resolveValue } from "./utils";
import { setNodeHandler, setDirectHandler } from "./events";
import { dispatchError, toError } from "./dispatch";
import { registry } from "../registry";
import { cleanupSubtree } from "./cleanup";
import { getState, peekState } from "./state";

let staticDom = new WeakMap<HellaNode, Element | DocumentFragment>();

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
 * @internal
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
 * @returns The resolved DOM Node
 */
export function resolveNode(value: HellaChild | HellaChild[], parent?: Node): Node {
  if (Array.isArray(value)) {
    const fragment = document.createDocumentFragment();
    let i = 0;
    const len = value.length;
    while (i < len) {
      fragment.appendChild(resolveNode(value[i]!, parent));
      i++;
    }
    return fragment;
  }
  if (value !== null && typeof value === "object" && "raw" in value) {
    return rawToFragment(value.raw);
  }
  if (value !== null && typeof value === "object" && (value as HellaNode).tag !== undefined) return mountNode(value as HellaNode);
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
 * @param node The HellaNode to mount
 * @param boundaryElement The nearest error boundary element (for error propagation during construction)
 * @returns The mounted DOM element or fragment
 */
export function mountNode(node: HellaNode, boundaryElement?: Element): HellaElement | DocumentFragment {
  if (node.static) {
    const cached = staticDom.get(node);
    if (cached) return cached.cloneNode(true) as HellaElement | DocumentFragment;
  }

  const { tag, props, on, e, bind, hooks, children, componentScope, error } = node;

  if (tag === "$") {
    const fragment = document.createDocumentFragment();
    appendToParent(fragment as unknown as HellaElement, children, boundaryElement);
    if (node.static) staticDom.set(node, fragment);
    return fragment;
  }

  const element = document.createElement(tag as string) as HellaElement;

  if (componentScope) {
    getState(element).componentScope = componentScope;
  }

  if (error) {
    const state = getState(element);
    state.errorConfig = error;
    state.originalNode = node;
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

  objectLoop(props, (key, value) => renderProp(element, key, value));

  objectLoop(on, (eventName, handler) =>
    setNodeHandler(element, eventName, handler as EventListener)
  );

  if (e) {
    objectLoop(e, (eventName, handler) =>
      setDirectHandler(element, eventName, handler as EventListener)
    );
  }

  objectLoop(bind, (key, value) =>
    registry.addEffect(element, () => {
      try {
        renderProp(element, key, resolveValue(value));
      } catch (err) {
        const config = getBoundaryConfig(currentBoundary);
        const fallback = dispatchError(toError(err), { phase: "update", element, config });
        if (fallback) {
          const target = currentBoundary ?? element;
          target.replaceChildren(mountNode(fallback));
        }
      }
    })
  );

  appendToParent(element, children, currentBoundary);

  if (node.static) staticDom.set(node, element);
  return element;
}

/**
 * @internal
 * Appends children to a parent element with reactive support.
 * Handles static text, HellaNodes, functions, and forEach.
 * @param parent The parent element
 * @param children The children to append
 * @param currentBoundary The nearest error boundary element (for error propagation during construction)
 */
function appendToParent(parent: HellaElement, children?: HellaChild[], currentBoundary?: Element) {
  if (!children || children.length === 0) return;

  if (children.length === 1 && typeof children[0] === "string") {
    parent.textContent = children[0];
    return;
  }

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

          const newNode = resolveNode(resolved as HellaChild, parent);

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

    if (child !== null && typeof child === "object" && "raw" in child) {
      parent.appendChild(rawToFragment(child.raw));
      continue;
    }

    const resolved = resolveValue(child);

    if (typeof resolved === "string" || typeof resolved === "number") {
      parent.appendChild(document.createTextNode(toText(resolved)));
    } else if (resolved instanceof Node) {
      parent.appendChild(resolved);
    } else if (resolved !== null && typeof resolved === "object" && (resolved as HellaNode).tag !== undefined) {
      parent.appendChild(mountNode(resolved as HellaNode, currentBoundary));
    }
  }
}
