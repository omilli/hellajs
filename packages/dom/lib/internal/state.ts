import type { ErrorConfig, HookType, HellaNode } from "../types/nodes";

export interface ElementState {
  effects: (() => void)[];
  handlers: Record<string, EventListener>;
  directHandlers: Map<string, EventListener>;
  hooks: Partial<Record<HookType, Array<(() => void) | ((node: Element) => void)>>>;
  mounted: boolean;
  componentScope?: () => void;
  portalCleanup?: () => void;
  errorConfig?: ErrorConfig;
  originalNode?: HellaNode;
  cachedBoundary?: Element;
  lazyCleanup?: () => void;
}

const elementMap = new WeakMap<Node, ElementState>();

export function getState(node: Node): ElementState {
  let state = elementMap.get(node);
  if (!state) {
    state = {
      effects: [],
      handlers: {},
      directHandlers: new Map(),
      hooks: {},
      mounted: false,
    };
    elementMap.set(node, state);
  }
  return state;
}

export function hasState(node: Node): boolean {
  return elementMap.has(node);
}

export function peekState(node: Node): ElementState | undefined {
  return elementMap.get(node);
}

export function deleteState(node: Node): void {
  elementMap.delete(node);
}
