import { componentRegistry } from "../global";
import { ComponentRegistryItem, EventHandler } from "./types";

// Attach an event to the component registry
// Delegate it to the root element
export function attachEvent(
  element: HTMLElement,
  eventName: string,
  handler: EventHandler,
  root: string
): void {
  const component = componentRegistry(root);
  const eventNameNotInRegistry = !component.eventNames.has(eventName);
  const elementNotInRegistry = !component.events.has(element);
  // Add the element to the component registry if it doesn't exist
  elementNotInRegistry && component.events.set(element, new Map());
  // Add the event to the element in the registry
  component.events.get(element)?.set(eventName, handler);
  // Delegate event if the event name e.g "click" is not in the registry
  eventNameNotInRegistry && addDelegatedEvent(component, eventName, root);
}

// Delete all non-existent dom elements from the component registry
export function cleanupDelegatedEvents(root: string): void {
  const component = componentRegistry(root);
  for (const [element] of component.events) {
    !document.contains(element) && component.events.delete(element);
  }
}

// Loop all event name keys from the component registry
// Remove all delegated events
export function removeDelegatedListeners(mount: Element, root: string) {
  const component = componentRegistry(root);
  component.eventNames.forEach((eventName) => {
    component.rootListeners.forEach((listener) => {
      mount.removeEventListener(eventName, listener);
    });
  });
}

// Swap component registry events from one element to another
// Used during dom diffing
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

// Add a delegated event to the root element
function addDelegatedEvent(
  component: ComponentRegistryItem,
  eventName: string,
  root: string
) {
  const listener = (event: Event) => {
    const target = event.target as HTMLElement;
    const handlers = component.events.get(target);
    const handler = handlers?.get(eventName);
    handler && handler(event);
  };
  component.eventNames.add(eventName);
  component.rootListeners.add(listener);
  const mount = document.querySelector(`[data-h-mount="${root}"]`)!;
  mount.addEventListener(eventName, listener);
}
