import { StyleConfig } from "../types";

export const STYLE_CACHE = {
  scoped: new Map<string, string>(),
  global: new Map<string, string>(),
};

export const STYLE_CONFIG: StyleConfig = {
  scope: "scoped",
  sizeTo: "px",
};

export const COMPONENT_REGISTRY = new Map<string, HTMLElement>();

export const DOM_STATE = {
  components: COMPONENT_REGISTRY,
  effects: new WeakMap<HTMLElement, Set<() => void>>(),
  nodeEffects: new WeakMap<Node, Set<() => void>>(),
  propEffects: new WeakMap<HTMLElement, Map<string, () => void>>(),
};
