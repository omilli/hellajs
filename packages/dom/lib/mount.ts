import type { HellaElement, HellaNode, HellaChild, RenderFn } from "./types/nodes";
import { isFunction, objectLoop } from "./internal/core";
import { isHellaNode, renderProp, resolveText, resolveValue } from "./internal/utils";
import { setNodeHandler } from "./internal/events";
import { setDirectHandler } from "./internal/direct-events";
import { dispatchError, toError, setMountNode } from "./error";
import { registry } from "./registry";

// Register mountNode callback for error handler reset functionality
// This lazy callback pattern avoids circular dependency between error.ts and mount.ts
setMountNode((node: HellaNode) => mountNode(node) as Node);

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
  // Mark as mounted synchronously for immediate reactive updates
  mountedNode.__hella_mounted = mountedNode.nodeType === Node.ELEMENT_NODE;
}

/**
 * Resolves a HellaChild to a DOM Node with reactive support.
 * @param value The value to resolve (HellaNode, function, or primitive)
 * @param parent Optional parent element for effect registration
 * @returns The resolved DOM Node
 */
export function resolveNode(value: HellaChild, parent?: HellaElement): Node {
  if (isHellaNode(value)) return mountNode(value);
  if (isFunction(value)) {
    const textNode = document.createTextNode("") as unknown as HellaElement;
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

  // Fragment handling - no element to attach error config
  if (tag === "$") {
    const fragment = document.createDocumentFragment();
    appendToParent(fragment as unknown as HellaElement, children, boundaryElement);
    return fragment;
  }

  const element = document.createElement(tag as string) as HellaElement;

  // Transfer component scope dispose to DOM element for cleanup
  __scope && (element.__hella_component_scope = __scope);

  // Store error config and original node on element
  // Original node enables reset() to re-render the initial state
  if (error) {
    element.__hella_error_config = error;
    element.__hella_original_node = node;
  }

  // Track nearest boundary - this element becomes boundary if it has config
  // Child errors will bubble to this boundary for fallback rendering
  const currentBoundary = error ? element : boundaryElement;

  // Register lifecycle hooks on element (stored as stacks for multiple hooks)
  if (hooks) {
    hooks.beforeMount && registry.addHook(element, "beforeMount", hooks.beforeMount);
    hooks.afterMount && registry.addHook(element, "afterMount", hooks.afterMount as (node: Element) => void);
    hooks.beforeDestroy && registry.addHook(element, "beforeDestroy", hooks.beforeDestroy as (node: Element) => void);
    hooks.afterDestroy && registry.addHook(element, "afterDestroy", hooks.afterDestroy);
    hooks.beforeUpdate && registry.addHook(element, "beforeUpdate", hooks.beforeUpdate as (node: Element) => void);
    hooks.afterUpdate && registry.addHook(element, "afterUpdate", hooks.afterUpdate as (node: Element) => void);

    // Execute beforeMount immediately with error handling
    // Errors dispatched to boundary but don't halt mounting
    if (hooks.beforeMount) {
      try {
        hooks.beforeMount();
      } catch (err) {
        const config = (currentBoundary as HellaElement)?.__hella_error_config;
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

  // Reactive bindings - wrap in try/catch for update-phase errors
  // Fallback rendering replaces boundary or element content
  objectLoop(bind, (key, value) =>
    registry.addEffect(element, () => {
      try {
        renderProp(element, key, resolveValue(value));
      } catch (err) {
        const config = (currentBoundary as HellaElement)?.__hella_error_config;
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

  // Fast path: single static text child avoids loop overhead
  if (children.length === 1 && typeof children[0] === 'string') {
    parent.textContent = children[0];
    return;
  }

  // Inherit boundary from parent if it has error config
  const currentBoundary = (parent as HellaElement).__hella_error_config ? parent : boundaryElement;

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
        // Use marker's parentNode to handle fragments correctly
        const actualParent = start.parentNode as HellaElement;
        if (!actualParent) return;

        try {
          const resolved = resolveValue(child);
          let currentNode = start.nextSibling;

          // Remove existing content between markers
          while (currentNode && currentNode !== end) {
            const nextNode = currentNode.nextSibling;
            actualParent.removeChild(currentNode);
            currentNode = nextNode;
          }

          // Handle Portal/ForEach/Lazy returned from a conditional expression.
          // Proxy actualParent so appendChild routes to insertBefore(end), placing
          // dynamic component markers between the reactive zone's start/end markers.
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

          // Insert new content (handle fragments by moving children)
          if (newNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            let fragChild: ChildNode | null;
            while ((fragChild = newNode.firstChild))
              actualParent.insertBefore(fragChild, end);
          } else {
            actualParent.insertBefore(newNode, end);
          }
        } catch (e) {
          // Mount-phase error in reactive child - dispatch to boundary
          const config = (currentBoundary as HellaElement)?.__hella_error_config;
          const fallback = dispatchError(toError(e), { phase: 'mount', element: actualParent, config });
          if (fallback) {
            // Clear content between markers before inserting fallback
            let currentNode = start.nextSibling;
            while (currentNode && currentNode !== end) {
              const next = currentNode.nextSibling;
              actualParent.removeChild(currentNode);
              currentNode = next;
            }
            // Render fallback at boundary level or inline
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
