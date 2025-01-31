import { componentRegistry } from "../global";
import { EventHandler } from "./types";

export function attachEvent(
  element: HTMLElement,
  eventName: string,
  handler: EventHandler,
  root: string
): void {
  const component = componentRegistry(root);
  if (!component.eventTypes.has(eventName)) {
    const listener = (event: Event) => {
      const target = event.target as HTMLElement;
      const handlers = component.events.get(target);
      const handler = handlers?.get(eventName);
      handler && handler(event);
    };
    component.eventTypes.add(eventName);
    component.rootListeners.add(listener);
    const mount = document.querySelector(`[data-h-mount="${root}"]`)!;
    mount.addEventListener(eventName, listener);
  }

  !component.events.has(element) && component.events.set(element, new Map());
  component.events.get(element)?.set(eventName, handler);
}

export function cleanupDelegatedEvents(root: string): void {
  const component = componentRegistry(root);
  for (const [element] of component.events) {
    !document.contains(element) && component.events.delete(element);
  }
}

export function removeDelegatedListeners(mount: Element, root: string) {
  const component = componentRegistry(root);
  component.eventTypes.forEach((eventName) => {
    component.rootListeners.forEach((listener) => {
      mount.removeEventListener(eventName, listener);
    });
  });
}

export function replaceEvents(
  current: HTMLElement,
  next: HTMLElement,
  root: string
) {
  const component = componentRegistry(root);
  const oldEvents = component.events.get(current);
  const newEvents = component.events.get(next);
  if (newEvents) {
    for (const [eventName, handler] of newEvents) {
      oldEvents?.set(eventName, handler);
    }
  }
}
