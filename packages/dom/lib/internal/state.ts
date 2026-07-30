import type { ErrorConfig, HellaNode, HookType, HookHandler } from "../types/nodes";

/**
 * @internal
 * Element state stored in a WeakMap, keyed by DOM node.
 * No properties are added to DOM elements themselves.
 * `directHandlers`, `effects`, and `hooks` are lazy-allocated on first use so
 * elements that never carry `e:` handlers / `bind:` effects / `hook:` hooks
 * pay no Map/array/object allocation at mount.
 */
export interface ElementState {
  effects?: (() => void)[];
  handlers: Record<string, EventListener>;
  directHandlers?: Map<string, EventListener>;
  hooks?: Partial<Record<HookType, Array<HookHandler>>>;
  isMounted: boolean;
  componentScope?: () => void;
  portalCleanup?: () => void;
  errorConfig?: ErrorConfig;
  originalNode?: HellaNode;
  cachedBoundary?: Element;
  lazyCleanup?: () => void;
  transitionCleanup?: () => void;
  suspenseCleanup?: () => void;
}

const elementMap = new WeakMap<Node, ElementState>();

/**
 * @internal
 * Gets or creates the state object for a DOM node.
 * @param node The DOM node to get state for
 * @returns The element state object
 */
export function getState(node: Node): ElementState {
  let state = elementMap.get(node);
  if (!state) {
    state = {
      handlers: {},
      isMounted: false,
    };
    elementMap.set(node, state);
  }
  return state;
}

/**
 * @internal
 * Checks if a DOM node has associated state.
 * @param node The DOM node to check
 * @returns True if the node has state
 */
export function hasState(node: Node): boolean {
  return elementMap.has(node);
}

/**
 * @internal
 * Returns the state object without creating one if absent.
 * @param node The DOM node to peek at
 * @returns The element state, or undefined if none exists
 */
export function peekState(node: Node): ElementState | undefined {
  return elementMap.get(node);
}

/**
 * @internal
 * Removes the state entry for a DOM node.
 * @param node The DOM node to delete state for
 */
export function deleteState(node: Node): void {
  elementMap.delete(node);
}
