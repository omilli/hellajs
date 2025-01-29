export * from "./reactive";
export * from "./dom";
export * from "./css";
export * from "./router";
export * from "./global";

export interface ComponentRegistryData {
  nodeEffects: Set<() => void>;
  propEffects: Set<() => void>;
  events: Map<HTMLElement, Map<string, (event: Event) => void>>;
}
