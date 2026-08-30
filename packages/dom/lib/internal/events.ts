import type { HellaNode, DirectListenerSpec } from "../types/nodes";
import { dispatchError, findBoundary, resolveErrorConfig, toError, getMountNode } from "./dispatch";
import { getState, peekState } from "./state";

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

  if (!globalListeners.has(type)) {
    globalListeners.add(type);
    document.body.addEventListener(type, delegatedHandler, true);
  }

  (state.handlers ?? (state.handlers = {}))[type] = handler;
}

/**
 * Renders an error-boundary fallback by replacing the boundary's (or the
 * element's own) children. Shared by the delegated and direct handler paths.
 */
function renderEventFallback(element: Element, fallback: HellaNode) {
  const target = findBoundary(element) ?? element;
  const mountNode = getMountNode();
  if (mountNode) target.replaceChildren(mountNode(fallback));
}

/**
 * Single delegated handler for all event types.
 * Uses composedPath() for ancestor traversal and dispatches
 * handler errors through the error boundary system.
 */
function delegatedHandler(event: Event) {
  const type = event.type;

  if (!globalListeners.has(type)) return;

  const path = event.composedPath();
  let i = 0;
  const len = path.length;

  while (i < len) {
    if (event.cancelBubble) break;
    const element = path[i++] as Element;
    const handler = peekState(element)?.handlers?.[type];

    if (handler) {
      try {
        handler.call(element, event);
      } catch (e) {
        const err = toError(e);
        const config = resolveErrorConfig(element);
        const fallback = dispatchError(err, { phase: "event", element, event, config });

        if (fallback) renderEventFallback(element, fallback);
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
 * @param handler Event handler function, or a `{ handler, options }` spec whose
 * native listener options (once/passive/capture) are forwarded to addEventListener
 */
export function setDirectHandler(
  element: Element,
  type: string,
  handler: EventListener | DirectListenerSpec
) {
  const state = getState(element);
  const handlers = state.directHandlers ?? (state.directHandlers = new Map());

  const isSpec = typeof handler === "object";
  const listener = isSpec ? handler.handler : handler;
  const options = isSpec ? handler.options : undefined;

  const wrappedHandler = (event: Event) => {
    try {
      listener.call(element, event);
    } catch (e) {
      const config = resolveErrorConfig(element);
      const fallback = dispatchError(toError(e), { phase: "event", element, event, config });
      if (fallback) renderEventFallback(element, fallback);
    }
  };

  element.addEventListener(type, wrappedHandler, options);
  handlers.set(type, { handler: wrappedHandler, options });
}

/**
 * @internal
 * Removes all direct handlers from an element.
 * Called during cleanup when element is removed from DOM.
 * @param node Node to cleanup
 */
export function removeDirectHandlers(node: Node) {
  const handlers = getState(node).directHandlers;
  if (!handlers) return;
  const iter = handlers.keys();
  let result = iter.next();
  while (!result.done) {
    const key = result.value;
    const stored = handlers.get(key)!;
    node.removeEventListener(key, stored.handler, stored.options);
    result = iter.next();
  }
  handlers.clear();
}

/**
 * @internal
 * Resets all event delegation state — removes global listeners and clears tracking set.
 */
export function resetEventState() {
  const types = Array.from(globalListeners);
  let i = 0;
  const len = types.length;
  while (i < len) {
    document.body.removeEventListener(types[i++]!, delegatedHandler, true);
  }
  globalListeners.clear();
}
