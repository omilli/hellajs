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
    COMPONENT_REGISTRY.set(root, COMPONENT_REGISTRY_DEFAULTS);
    component = COMPONENT_REGISTRY.get(root);
  }

  if (!component!.events.has(element)) {
    component!.events.set(element, new Map());
  }

  const wrappedHandler = (event: Event) => {
    handler(event);
  };

  element.addEventListener(eventName, wrappedHandler);
  component!.events.get(element)?.set(eventName, wrappedHandler);
}

export function cleanupElementEvents(
  element: HTMLElement | null,
  root: string
): void {
  const component = COMPONENT_REGISTRY.get(root);
  if (!component?.events) return;

  for (const [el] of component.events) {
    if (!document.contains(el)) {
      const handlers = component.events.get(el);
      if (handlers) {
        handlers.forEach((handler, eventName) => {
          el.removeEventListener(eventName, handler);
        });
        component.events.delete(el);
      }
    }
  }

  if (element) {
    const handlers = component.events.get(element);
    if (handlers) {
      handlers.forEach((handler, eventName) => {
        element.removeEventListener(eventName, handler);
      });
      component.events.delete(element);
    }
  }
}
