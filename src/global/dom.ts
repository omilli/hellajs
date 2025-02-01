import { ComponentRegistry, ComponentRegistryItem } from "../dom/types";

export const COMPONENT_REGISTRY: ComponentRegistry = new Map<
  string,
  ComponentRegistryItem
>();

export function componentRegistry(root: string) {
  let component = COMPONENT_REGISTRY.get(root);
  if (!component) {
    COMPONENT_REGISTRY.set(root, {
      nodeEffects: new Set(),
      propEffects: new Set(),
      eventNames: new Set(),
      events: new Map(),
      rootListeners: new Set(),
    });
    component = COMPONENT_REGISTRY.get(root);
  }
  return component!;
}
