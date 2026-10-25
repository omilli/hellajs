import type { TemplateBuildFn } from "../runtime";
import { dispatchError, findBoundary, resolveErrorConfig, toError } from "./dispatch";
import { resolveNode } from "./render";
import { constructFresh } from "./adoption";
import { getState, peekState, popBuildParent, pushBuildParent } from "./state";

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
 * @internal
 * Renders an error-boundary fallback by replacing the boundary's (or the
 * element's own) children. Shared by the delegated and direct handler paths
 * (the direct handler implementation lives in the direct-events feature).
 * The fallback is a flagged build fn — invoked through `resolveNode`'s flagged
 * branch (its build frame + componentScope wiring are the shared seams) and
 * swapped in over the boundary-or-element target.
 * @param element The element whose handler threw
 * @param fallback The fallback flagged build fn to render
 */
export function renderEventFallback(element: Element, fallback: TemplateBuildFn) {
  const target = findBoundary(element) ?? element;
  pushBuildParent(target);
  const fresh = constructFresh(() => resolveNode(fallback, target));
  popBuildParent();
  target.replaceChildren(fresh);
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
