import { componentRegistry } from "../global";
import { EVENT_TYPES } from "../global/events";
import { EventHandler } from "../types";

export function attachEvent(
  element: HTMLElement,
  eventName: string,
  handler: EventHandler,
  root: string
): void {
  const components = componentRegistry(root);
  !components.events.has(element) && components.events.set(element, new Map());
  components.events.get(element)?.set(eventName, handler);
}

export function cleanupElementEvents(root: string): void {
  const components = componentRegistry(root);
  for (const [el] of components.events) {
    !document.contains(el) && components.events.delete(el);
  }
}

export function delegateEvents(mountTarget: HTMLElement, root: string) {
  EVENT_TYPES.forEach((type) => {
    mountTarget.addEventListener(
      type,
      (event) => {
        const components = componentRegistry(root);
        const target = event.target as HTMLElement;
        const handlers = components.events.get(target);
        const handler = handlers?.get(type);
        handler && handler(event);
      },
      true
    );
  });
}
