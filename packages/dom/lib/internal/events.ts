import { registry } from "../registry";
import { handlerCounts } from "./counts";
import { dispatchError, findBoundary, resolveErrorConfig, toError, getMountNode } from "../error";
import { getState, hasState } from "./element-map";

const globalListeners = new Set<string>();

/**
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

  registry.addEvent(element, type, handler);
}

/**
 * Single delegated handler for all event types.
 * Uses composedPath() for pre-computed ancestor chain (faster than walking parentElement).
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
