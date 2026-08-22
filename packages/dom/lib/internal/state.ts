import type { ErrorConfig, HellaNode, HookType, HookFn } from "../types/nodes";

/**
 * @internal
 * Element state stored in a WeakMap, keyed by DOM node.
 * No properties are added to DOM elements themselves.
 * Every collection field (`handlers`, `effects`, `directHandlers`, `hooks`) is
 * lazy-allocated on first use so elements that never carry `on:` handlers /
 * function-ref prop effects / `e:` handlers / `hook:` hooks pay no collection
 * allocation at mount.
 */
export interface ElementState {
  effects?: (() => void)[];
  handlers?: Record<string, EventListener>;
  directHandlers?: Map<string, EventListener>;
  hooks?: Partial<Record<HookType, Array<HookFn>>>;
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
 * Gets or creates the state object for a DOM node.
 * @param node The DOM node to get state for
 * @returns The element state object
 */
export function getState(node: Node): ElementState {
  let state = elementMap.get(node);
  if (!state) {
    state = {
      isMounted: false,
    };
    elementMap.set(node, state);
  }
  return state;
}

/**
 * Checks if a DOM node has associated state.
 * @param node The DOM node to check
 * @returns True if the node has state
 */
export function hasState(node: Node): boolean {
  return elementMap.has(node);
}

/**
 * Returns the state object without creating one if absent.
 * @param node The DOM node to peek at
 * @returns The element state, or undefined if none exists
 */
export function peekState(node: Node): ElementState | undefined {
  return elementMap.get(node);
}

/**
 * Removes the state entry for a DOM node.
 * @param node The DOM node to delete state for
 */
export function deleteState(node: Node): void {
  elementMap.delete(node);
}
