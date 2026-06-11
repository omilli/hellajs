import type { HellaElement, HellaNode, HellaChild, RenderFn, ErrorConfig } from "./types/nodes";
import { isFunction, objectLoop } from "./internal/core";
import { isHellaNode, renderProp, resolveText, resolveValue } from "./internal/utils";
import { setNodeHandler } from "./internal/events";
import { setDirectHandler } from "./internal/direct-events";
import { dispatchError, toError, setMountNode } from "./error";
import { registry } from "./registry";
import { getState, hasState, peekState } from "./internal/element-map";

setMountNode((node: HellaNode) => mountNode(node) as Node);

function getBoundaryConfig(boundary: Element | undefined): ErrorConfig | undefined {
  if (!boundary) return undefined;
  const state = peekState(boundary);
  return state ? state.errorConfig : undefined;
}

/**
 * Mounts a HellaNode to a DOM element, replacing all existing content.
 * @param node The HellaNode or component function to mount
 * @param target CSS selector string or Element to mount into (defaults to "#app")
 */
export function mount(
  node: HellaNode | (() => HellaNode) | (() => Promise<HellaNode>),
  target: string | Element = "#app"
) {
  const mountedNode = mountNode(resolveValue(node) as HellaNode) as HellaElement;
  const container = typeof target === "string" ? document.querySelector(target) : target;
  container?.replaceChildren(mountedNode);
  if (mountedNode.nodeType === Node.ELEMENT_NODE) {
    getState(mountedNode).mounted = true;
  }
}

/**
 * Resolves a HellaChild to a DOM Node with reactive support.
 * @param value The value to resolve (HellaNode, function, or primitive)
 * @param parent Optional parent element for effect registration
 * @returns The resolved DOM Node
 */
export function resolveNode(value: HellaChild, parent?: Node): Node {
  if (isHellaNode(value)) return mountNode(value);
  if (isFunction(value)) {
    const textNode = document.createTextNode("");
    registry.addEffect(parent || textNode, () =>
      textNode.textContent = resolveText(value())
    );
    return textNode;
  }
  return document.createTextNode(resolveText(value));
}

/**
 * Mounts a HellaNode to a DOM element or fragment with all properties and lifecycle hooks.
 * @param node The HellaNode to mount
 * @param boundaryElement The nearest error boundary element (for error propagation during construction)
 * @returns The mounted DOM element or fragment
 */
export function mountNode(node: HellaNode, boundaryElement?: Element): HellaElement | DocumentFragment {
  const { tag, props, on, e, bind, hooks, children = [], __scope, error } = node;

  if (tag === "$") {
    const fragment = document.createDocumentFragment();
    appendToParent(fragment as unknown as HellaElement, children, boundaryElement);
    return fragment;
  }

  const element = document.createElement(tag as string) as HellaElement;

  if (__scope) {
    getState(element).componentScope = __scope;
  }

  if (error) {
    const state = getState(element);
    state.errorConfig = error;
    state.originalNode = node;
  }

  const currentBoundary = error ? element : boundaryElement;

  if (hooks) {
    hooks.beforeMount && registry.addHook(element, "beforeMount", hooks.beforeMount);
    hooks.afterMount && registry.addHook(element, "afterMount", hooks.afterMount as (node: Element) => void);
    hooks.beforeDestroy && registry.addHook(element, "beforeDestroy", hooks.beforeDestroy as (node: Element) => void);
    hooks.afterDestroy && registry.addHook(element, "afterDestroy", hooks.afterDestroy);
    hooks.beforeUpdate && registry.addHook(element, "beforeUpdate", hooks.beforeUpdate as (node: Element) => void);
    hooks.afterUpdate && registry.addHook(element, "afterUpdate", hooks.afterUpdate as (node: Element) => void);

    if (hooks.beforeMount) {
      try {
        hooks.beforeMount();
      } catch (err) {
        const config = getBoundaryConfig(currentBoundary);
        dispatchError(toError(err), { phase: 'mount', element, config });
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
        const fallback = dispatchError(toError(err), { phase: 'update', element, config });
        if (fallback) {
          const target = currentBoundary ?? element;
          target.replaceChildren(mountNode(fallback));
        }
      }
    })
  );

  appendToParent(element, children, currentBoundary);

  return element;
}

/**
 * Appends children to a parent element with reactive support.
 * Handles static text, HellaNodes, functions, and forEach.
 * @param parent The parent element
 * @param children The children to append
 * @param boundaryElement The nearest error boundary element (for error propagation during construction)
 */
function appendToParent(parent: HellaElement, children?: HellaChild[], boundaryElement?: Element) {
  if (!children || children.length === 0) return;

  if (children.length === 1 && typeof children[0] === 'string') {
    parent.textContent = children[0];
    return;
  }

  const currentBoundary = hasState(parent) && getState(parent).errorConfig ? parent : boundaryElement;

  let index = 0;
  const length = children.length;
  for (; index < length; index++) {
    const child = children[index];

    if (isFunction(child)) {
      if ((child as RenderFn).isDynamic) {
        child(parent);
        continue;
      }

      const start = document.createComment("start"),
        end = document.createComment("end");

      parent.appendChild(start);
      parent.appendChild(end);

      registry.addEffect(parent, () => {
        const actualParent = start.parentNode as HellaElement;
        if (!actualParent) return;

        try {
          const resolved = resolveValue(child);
          let currentNode = start.nextSibling;

          while (currentNode && currentNode !== end) {
            const nextNode = currentNode.nextSibling;
            actualParent.removeChild(currentNode);
            currentNode = nextNode;
          }

          if (isFunction(resolved) && (resolved as RenderFn).isDynamic) {
            const proxyParent = new Proxy(actualParent as Element, {
              get(target, prop) {
                if (prop === 'appendChild') return (node: Node) => target.insertBefore(node, end);
                const val = (target as unknown as Record<string, unknown>)[prop as string];
                return typeof val === 'function' ? (val as (...args: unknown[]) => unknown).bind(target) : val;
              }
            });
            (resolved as RenderFn)(proxyParent as HellaElement);
            return;
          }

          const newNode = resolveNode(resolved, parent);

          if (newNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            let fragChild: ChildNode | null;
            while ((fragChild = newNode.firstChild))
              actualParent.insertBefore(fragChild, end);
          } else {
            actualParent.insertBefore(newNode, end);
          }
        } catch (e) {
          const config = getBoundaryConfig(currentBoundary);
          const fallback = dispatchError(toError(e), { phase: 'mount', element: actualParent, config });
          if (fallback) {
            let currentNode = start.nextSibling;
            while (currentNode && currentNode !== end) {
              const next = currentNode.nextSibling;
              actualParent.removeChild(currentNode);
              currentNode = next;
            }
            if (currentBoundary) {
              currentBoundary.replaceChildren(mountNode(fallback));
            } else {
              actualParent.insertBefore(mountNode(fallback), end);
            }
          }
        }
      });

      continue;
    }

    const resolved = resolveValue(child);

    if (typeof resolved === "string" || typeof resolved === "number") {
      parent.appendChild(document.createTextNode(resolveText(resolved)));
    } else if (resolved instanceof Node) {
      parent.appendChild(resolved);
    } else if (isHellaNode(resolved)) {
      parent.appendChild(mountNode(resolved, currentBoundary));
    }
  }
}
