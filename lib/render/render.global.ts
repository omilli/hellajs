import { ComponentRegistry } from "./render.types";

export const HELLA_COMPONENTS: ComponentRegistry = new Map();

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
    cleanups: new Map(), // Add cleanups map
  });
}

// Rename and update to handle both events and cleanups
export function cleanupComponent(root: string) {
  const component = HELLA_COMPONENTS.get(root);
  if (!component) return;

  // Cleanup all registered functions
  for (const cleanup of component.cleanups.values()) {
    cleanup();
  }
  component.cleanups.clear();

  // Remove component registration
  HELLA_COMPONENTS.delete(root);
}
