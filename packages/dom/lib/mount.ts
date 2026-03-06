import type { HellaElement, HellaNode, HellaChild, RenderFn, ErrorHook } from "./types/nodes.d.ts";
import { isFunction, objectLoop } from "./internal/core";
import { isHellaNode, renderProp, resolveText, resolveValue } from "./internal/utils";
import { setNodeHandler } from "./internal/events";
import { setDirectHandler } from "./internal/direct-events";

import { registry, setErrorHandler } from "./registry";

/**
 * Handles an error by finding the error boundary and rendering fallback.
 * Uses stored boundary reference for elements not yet in DOM tree.
 */
function handleError(origin: Element, error: Error): void {
  let boundary: HellaElement | null = null;

  // First check if element has a stored boundary reference (for elements not in DOM yet)
  const originEl = origin as HellaElement;

  // Walk up looking for boundary - check stored reference first, then DOM tree
  let current: Element | null = origin;
  while (current) {
    const el = current as HellaElement;
    if (el.__hella_onError && !el.__hella_error_state) {
      boundary = el;
      break;
    }
    // Try DOM parent first, then check for stored boundary reference
    current = current.parentElement;
    if (!current && el.__hella_boundary) {
      current = el.__hella_boundary;
    }
  }

  if (!boundary) throw error;

  boundary.__hella_error_state = true;

  const reset = () => {
    boundary!.__hella_error_state = false;
    if (boundary!.__hella_original_node) {
      boundary!.replaceChildren(mountNode(boundary!.__hella_original_node));
    }
  };

  const fallback = boundary.__hella_onError!(error, reset);

  if (fallback) {
    boundary.replaceChildren(mountNode(fallback));
  } else {
    boundary.__hella_error_state = false;
    // Propagate to parent boundary
    const parentBoundary = boundary.parentElement || (boundary as HellaElement).__hella_boundary;
    if (parentBoundary) {
      handleError(parentBoundary, error);
    } else {
      throw error;
    }
  }
}

// Register error handler for use by events.ts
setErrorHandler(handleError);

/**
 * Wraps a function call in try-catch, delegating to error boundary on failure.
 */
function safeCall<T>(element: HellaElement, fn: () => T): T | undefined {
  try {
    return fn();
  } catch (e) {
    handleError(element, e instanceof Error ? e : new Error(String(e)));
  }
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
 * @param boundary Optional error boundary element to inherit
 * @returns The mounted DOM element or fragment
 */
export function mountNode(node: HellaNode, boundary?: HellaElement): HellaElement | DocumentFragment {
  const { tag, props, on, e, bind, hooks, children = [], __scope } = node;

  if (tag === "$") {
    const fragment = document.createDocumentFragment();
    appendToParent(fragment as unknown as HellaElement, children, boundary);
    return fragment;
  }

  const element = document.createElement(tag as string) as HellaElement;

  // Transfer component scope dispose to DOM element
  __scope && (element.__hella_component_scope = __scope);

  // Determine this element's error boundary for children
  let elementBoundary = boundary;

  if (hooks) {
    // Store onError directly on element (not in stacks - it's not a lifecycle hook)
    if (hooks.onError) {
      element.__hella_onError = hooks.onError;
      element.__hella_original_node = node;
      // Store parent boundary for propagation even if this element is a boundary
      if (boundary) {
        element.__hella_boundary = boundary;
      }
      elementBoundary = element; // This element is now the boundary for children
    }

    hooks.beforeMount && registry.addHook(element, "beforeMount", hooks.beforeMount);
    hooks.afterMount && registry.addHook(element, "afterMount", hooks.afterMount as (node: Element) => void);
    hooks.beforeDestroy && registry.addHook(element, "beforeDestroy", hooks.beforeDestroy as (node: Element) => void);
    hooks.afterDestroy && registry.addHook(element, "afterDestroy", hooks.afterDestroy);
    hooks.beforeUpdate && registry.addHook(element, "beforeUpdate", hooks.beforeUpdate as (node: Element) => void);
    hooks.afterUpdate && registry.addHook(element, "afterUpdate", hooks.afterUpdate as (node: Element) => void);

    // Run beforeMount with error handling
    if (hooks.beforeMount) {
      safeCall(element, hooks.beforeMount);
    }
  }

  // Store reference to nearest boundary for error handling during mount
  if (elementBoundary && elementBoundary !== element) {
    element.__hella_boundary = elementBoundary;
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
      safeCall(element, () => renderProp(element, key, resolveValue(value)));
    })
  );

  appendToParent(element, children, elementBoundary);

  return element;
}

/**
 * Appends children to a parent element with reactive support.
 * Handles static text, HellaNodes, functions, and forEach.
 * @param parent The parent element
 * @param children The children to append
 * @param boundary The error boundary to propagate to children
 */
function appendToParent(parent: HellaElement, children?: HellaChild[], boundary?: HellaElement) {
  if (!children || children.length === 0) return;

  // Fast path: single static text child
  if (children.length === 1 && typeof children[0] === 'string') {
    parent.textContent = children[0];
    return;
  }

  let index = 0, length = children.length;
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

        safeCall(actualParent, () => {
          let newNode = resolveNode(resolveValue(child), parent),
            currentNode = start.nextSibling;

          while (currentNode && currentNode !== end) {
            const nextNode = currentNode.nextSibling;
            actualParent.removeChild(currentNode);
            currentNode = nextNode;
          }

          if (newNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            let fragChild: ChildNode | null;
            while ((fragChild = newNode.firstChild))
              actualParent.insertBefore(fragChild, end);
          } else {
            actualParent.insertBefore(newNode, end);
          }
        });
      });

      continue;
    }

    const resolved = resolveValue(child);

    if (typeof resolved === "string" || typeof resolved === "number") {
      parent.appendChild(document.createTextNode(resolveText(resolved)));
    } else if (resolved instanceof Node) {
      parent.appendChild(resolved);
    } else if (isHellaNode(resolved)) {
      parent.appendChild(mountNode(resolved, boundary));
    }
  }
}