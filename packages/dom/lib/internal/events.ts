import type { HellaNode, DirectListenerSpec } from "../types/nodes";
import { dispatchError, findBoundary, resolveErrorConfig, toError, getMountNode } from "./dispatch";
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
 * @param element The element whose handler threw
 * @param fallback The fallback HellaNode to render
 */
export function renderEventFallback(element: Element, fallback: HellaNode) {
  const target = findBoundary(element) ?? element;
  const mountNode = getMountNode();
  if (mountNode) {
    pushBuildParent(target);
    const fresh = mountNode(fallback);
    popBuildParent();
    target.replaceChildren(fresh);
  }
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
 * Sets a direct (non-delegated) event handler on an element — wraps the handler with
 * error-boundary support and replaces the previous handler for the same event type.
 * The default (direct-events feature not loaded) registers nothing: `e:` JSX loads the
 * feature via the babel plugin, and hand-built `e` buckets need the documented
 * `import "@hellajs/dom/features/direct-events"` escape hatch.
 *
 * Exported `let` is deliberate: the feature swaps the implementation at module init
 * through {@link setDirectEventFeature} (the `setMountNode` injection pattern) while
 * every importer keeps the live binding.
 * @param element Target element
 * @param type Event type (e.g., 'focus', 'blur', 'load')
 * @param handler Event handler function, or a `{ handler, options }` spec whose
 * native listener options (once/passive/capture) are forwarded to addEventListener
 */
export let bindDirectHandler: (
  element: Element,
  type: string,
  handler: EventListener | DirectListenerSpec,
) => void = () => {};

/**
 * @internal
 * Removes all direct handlers from an element during cleanup. The default
 * (direct-events feature not loaded) does nothing — direct-handler maps are only
 * allocated by the feature's registration.
 * @param node Node to cleanup
 * @param handlers The node's direct-handler map (caller already holds the state)
 */
export let removeDirectHandlers: (
  node: Node,
  handlers: Map<string, DirectListenerSpec>,
) => void = () => {};

/**
 * The direct-events feature's handler implementations, registered at its module init.
 */
interface DirectEventFeature {
  bindDirectHandler: (
    element: Element,
    type: string,
    handler: EventListener | DirectListenerSpec,
  ) => void;
  removeDirectHandlers: (node: Node, handlers: Map<string, DirectListenerSpec>) => void;
}

/**
 * @internal
 * Registers the direct-events feature's handler machinery (the `setMountNode` injection
 * pattern — the implementations live in `lib/features/direct-events.ts` so unused
 * `e:` wiring tree-shakes out of bundles that never load the feature).
 * @param feature The direct-event handler implementations
 */
export function setDirectEventFeature(feature: DirectEventFeature): void {
  bindDirectHandler = feature.bindDirectHandler;
  removeDirectHandlers = feature.removeDirectHandlers;
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
