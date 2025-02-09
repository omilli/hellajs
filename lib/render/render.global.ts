import { ComponentRegistry, ComponentRegistryItem } from "./render.types";

export const HELLA_COMPONENTS: ComponentRegistry = new Map<
  string,
  ComponentRegistryItem
>();

export function componentRegistry(root: string) {
  let component = HELLA_COMPONENTS.get(root);
  if (!component) {
    resetComponentRegistry(root);
    component = HELLA_COMPONENTS.get(root);
  }
  return component!;
}

export function resetComponentRegistry(root: string) {
  HELLA_COMPONENTS.set(root, {
    eventNames: new Set(),
    events: new Map(),
    rootListeners: new Set(),
  });
}

export function removeComponentRegistry(root: string) {
  HELLA_COMPONENTS.delete(root);
}
