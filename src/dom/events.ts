import { COMPONENT_REGISTRY, COMPONENT_REGISTRY_DEFAULTS } from "../global";
import { EventHandler } from "../types";

export function attachEvent(
  element: HTMLElement,
  eventName: string,
  handler: EventHandler,
  root: string
): void {
  let component = COMPONENT_REGISTRY.get(root);
  if (!component) {
    component = {
      ...COMPONENT_REGISTRY_DEFAULTS,
      events: new Map(),
    };
    COMPONENT_REGISTRY.set(root, component);
  }

  if (!component.events.has(element)) {
    component.events.set(element, new Map());
  }

  const wrappedHandler = (event: Event) => {
    handler(event);
  };

  element.addEventListener(eventName, wrappedHandler);
  component.events.get(element)?.set(eventName, wrappedHandler);
}

export function removeEvent(
  element: HTMLElement,
  eventName: string,
  root: string
): void {
  const component = COMPONENT_REGISTRY.get(root);
  if (!component?.events.has(element)) return;

  const handler = component.events.get(element)?.get(eventName);
  if (handler) {
    element.removeEventListener(eventName, handler);
    component.events.get(element)?.delete(eventName);
  }

  if (component.events.get(element)?.size === 0) {
    component.events.delete(element);
  }
}

export function cleanupElementEvents(element: HTMLElement, root: string): void {
  const component = COMPONENT_REGISTRY.get(root);
  if (!component?.events.has(element)) return;

  const handlers = component.events.get(element);
  if (handlers) {
    handlers.forEach((handler, eventName) => {
      element.removeEventListener(eventName, handler);
    });
    component.events.delete(element);
  }
}
