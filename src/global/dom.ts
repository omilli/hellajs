import { StyleConfig } from "../types";

export const STYLE_CACHE = {
  scoped: new Map<string, string>(),
  global: new Map<string, string>(),
};

export const STYLE_CONFIG: StyleConfig = {
  scope: "scoped",
  sizeTo: "px",
};

export const COMPONENT_REGISTRY_DEFAULTS = {
  nodeEffects: new Set<() => void>(),
  propEffects: new Set<() => void>(),
  events: new Map<HTMLElement, Map<string, (event: Event) => void>>(),
  rootListeners: new Set<string>(),
};

export const COMPONENT_REGISTRY = new Map<
  string,
  {
    nodeEffects: Set<() => void>;
    propEffects: Set<() => void>;
    events: Map<HTMLElement, Map<string, (event: Event) => void>>;
    rootListeners: Set<string>;
  }
>();
