import { registry } from "../registry";
import { handlerCounts } from "./counts";
import { dispatchError, findBoundary, resolveErrorConfig, toError, getMountNode } from "../error";
import type { HellaElement } from "../types/nodes.d.ts";

const HANDLERS_KEY = "__hella_handlers";

// Tracks which event types have global listeners registered
const globalListeners = new Set<string>();

/**
 * Registers a delegated event handler on an element.
 * Creates a single global listener per event type for efficiency.
 * @param element Target element
 * @param type Event type (e.g., 'click', 'input')
 * @param handler Event handler function
 */
export function setNodeHandler(element: HellaElement, type: string, handler: EventListener) {
  // Track handler count for fast-exit optimization
  !element[HANDLERS_KEY]?.[type] && handlerCounts.set(type, (handlerCounts.get(type) || 0) + 1);

  // Register global listener on first handler of this type
  if (!globalListeners.has(type)) {
    globalListeners.add(type);
    // Capture phase ensures we see events before they reach elements
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

  // Fast exit if no handlers registered for this type
  if (!handlerCounts.has(type)) return;

  // composedPath gives us the full propagation path
  const path = event.composedPath();
  let i = 0;
  const len = path.length;

  // Traverse path - handlers execute in capture order
  while (i < len) {
    const element = path[i++] as HellaElement;
    const handler = element[HANDLERS_KEY]?.[type];

    if (handler) {
      try {
        // Maintain correct `this` context
        handler.call(element, event);
      } catch (e) {
        // Error handling with boundary support
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
