import { ComponentRegistry, ComponentRegistryItem } from "../dom/types";

export const COMPONENT_REGISTRY: ComponentRegistry = new Map<
  string,
  ComponentRegistryItem
>();

export function componentRegistry(root: string) {
  let component = COMPONENT_REGISTRY.get(root);
  if (!component) {
    resetComponentRegistry(root);
    component = COMPONENT_REGISTRY.get(root);
  }
  return component!;
}

export function resetComponentRegistry(root: string) {
  COMPONENT_REGISTRY.set(root, {
    eventNames: new Set(),
    events: new Map(),
    rootListeners: new Set(),
  });
}

export function removeComponentRegistry(root: string) {
  COMPONENT_REGISTRY.delete(root);
}
