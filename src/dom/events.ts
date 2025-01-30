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

export function cleanupElementEvents(root: string): void {
  const component = componentRegistry(root);
  for (const [el] of component.events) {
    !document.contains(el) && component.events.delete(el);
  }
}

export function delegateEvents(mountTarget: HTMLElement, root: string) {
  EVENT_TYPES.forEach((type) => {
    mountTarget.addEventListener(
      type,
      (event) => {
        const component = componentRegistry(root);
        const target = event.target as HTMLElement;
        const handlers = component.events.get(target);
        const handler = handlers?.get(type);
        handler && handler(event);
      },
      true
    );
  });
}
