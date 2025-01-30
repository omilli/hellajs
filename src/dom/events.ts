import { componentRegistry } from "../global";
import { EVENT_TYPES } from "../global/events";
import { EventHandler } from "../types";

export function attachEvent(
  element: HTMLElement,
  eventName: string,
  handler: EventHandler,
  root: string
): void {
  const component = componentRegistry(root);
  !component.events.has(element) && component.events.set(element, new Map());
  component.events.get(element)?.set(eventName, handler);
}

export function cleanupDelegatedEvents(root: string): void {
  const component = componentRegistry(root);
  for (const [el] of component.events) {
    !document.contains(el) && component.events.delete(el);
  }
}

export function delegateEvents(mountTarget: HTMLElement, root: string) {
  EVENT_TYPES.forEach((type) => {
    const listener = (event: Event) => {
      const component = componentRegistry(root);
      const target = event.target as HTMLElement;
      const handlers = component.events.get(target);
      const handler = handlers?.get(type);
      handler && handler(event);
    };
    const component = componentRegistry(root);
    component.rootListeners.add(listener);
    mountTarget.addEventListener(type, listener);
  });
}

export function removeDelegatedListeners(
  mountTarget: HTMLElement,
  root: string
) {
  const component = componentRegistry(root);
  EVENT_TYPES.forEach((type) => {
    component.rootListeners.forEach((listener) => {
      mountTarget.removeEventListener(type, listener);
    });
  });
}
