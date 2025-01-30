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

export function delegateEvents(mountTarget: HTMLElement, root: string) {
  EVENT_TYPES.forEach((eventName) => {
    const listener = (event: Event) => {
      const component = componentRegistry(root);
      const target = event.target as HTMLElement;
      const handlers = component.events.get(target);
      const handler = handlers?.get(eventName);
      handler && handler(event);
    };
    const component = componentRegistry(root);
    component.rootListeners.add(listener);
    mountTarget.addEventListener(eventName, listener);
  });
}

export function cleanupDelegatedEvents(root: string): void {
  const component = componentRegistry(root);
  for (const [el] of component.events) {
    !document.contains(el) && component.events.delete(el);
  }
}

export function removeDelegatedListeners(
  mountTarget: HTMLElement,
  root: string
) {
  const component = componentRegistry(root);
  EVENT_TYPES.forEach((eventName) => {
    component.rootListeners.forEach((listener) => {
      mountTarget.removeEventListener(eventName, listener);
    });
  });
}

export function replaceEvents(
  oldElement: HTMLElement,
  newElement: HTMLElement,
  root: string
) {
  const component = componentRegistry(root);

  const oldEvents = component.events.get(oldElement);
  const newEvents = component.events.get(newElement);

  if (newEvents) {
    for (const [eventName, handler] of newEvents) {
      oldEvents?.set(eventName, handler);
    }
  }
}
