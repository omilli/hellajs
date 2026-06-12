import { handlerCounts } from "./counts";
import { dispatchError, findBoundary, resolveErrorConfig, toError, getMountNode } from "./dispatch";
import { getState, hasState } from "./state";

const globalListeners = new Set<string>();

/**
 * @internal
 * Registers a delegated event handler on an element.
 * Creates a single global listener per event type for efficiency.
 * @param element Target element
 * @param type Event type (e.g., 'click', 'input')
 * @param handler Event handler function
 */
export function setNodeHandler(element: Element, type: string, handler: EventListener) {
  const state = getState(element);
  !state.handlers[type] && handlerCounts.set(type, (handlerCounts.get(type) || 0) + 1);

  if (!globalListeners.has(type)) {
    globalListeners.add(type);
    document.body.addEventListener(type, delegatedHandler, true);
  }

  state.handlers[type] = handler;
}

/**
 * @internal
 * Single delegated handler for all event types.
 * Uses composedPath() for ancestor traversal and dispatches
 * handler errors through the error boundary system.
 */
function delegatedHandler(event: Event) {
  const type = event.type;

  if (!handlerCounts.has(type)) return;

  const path = event.composedPath();
  let i = 0;
  const len = path.length;

  while (i < len) {
    const element = path[i++] as Element;
    if (!hasState(element)) continue;
    const handler = getState(element).handlers[type];

    if (handler) {
      try {
        handler.call(element, event);
      } catch (e) {
        const err = toError(e);
        const config = resolveErrorConfig(element);
        const fallback = dispatchError(err, { phase: 'event', element, event, config });

        if (fallback) {
          const target = findBoundary(element) ?? element;
          const mountNode = getMountNode();
          if (mountNode) target.replaceChildren(mountNode(fallback));
        }
      }
    }
  }
}

/**
 * @internal
 * Sets a direct (non-delegated) event handler on an element.
 * Wraps handler with error boundary support - catches errors and
 * renders fallback UI if configured.
 * Replaces existing handler for same event type.
 * @param element Target element
 * @param type Event type (e.g., 'focus', 'blur', 'load')
 * @param handler Event handler function
 */
export function setDirectHandler(element: Element, type: string, handler: EventListener) {
  const handlers = getState(element).directHandlers;

  const existing = handlers.get(type);
  if (existing) {
    element.removeEventListener(type, existing);
  }

  const wrappedHandler = (event: Event) => {
    try {
      handler.call(element, event);
    } catch (e) {
      const config = resolveErrorConfig(element);
      const fallback = dispatchError(toError(e), { phase: 'event', element, event, config });
      if (fallback) {
        const target = findBoundary(element) ?? element;
        const mountNode = getMountNode();
        if (mountNode) target.replaceChildren(mountNode(fallback));
      }
    }
  };

  element.addEventListener(type, wrappedHandler);
  handlers.set(type, wrappedHandler);
}

/**
 * @internal
 * Removes all direct handlers from an element.
 * Called during cleanup when element is removed from DOM.
 * @param element Element to cleanup
 */
export function removeDirectHandlers(node: Node) {
  if (!hasState(node)) return;
  const handlers = getState(node).directHandlers;
  const iter = handlers.keys();
  let result = iter.next();
  while (!result.done) {
    const key = result.value;
    node.removeEventListener(key, handlers.get(key)!);
    result = iter.next();
  }
  handlers.clear();
}
