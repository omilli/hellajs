import { componentRegistry } from "./global";
import { ComponentRegistryItem, EventHandler } from "./types";
import { getRootElement } from "./utils";

// Attach an event to the component registry
// Delegate it to the rootSelector element
export function attachEvent(
  element: HTMLElement,
  eventName: string,
  handler: EventHandler,
  rootSelector: string
): void {
  const component = componentRegistry(rootSelector);
  const isNewEventName = !component.eventNames.has(eventName);
  const isNewElement = !component.events.has(element);
  isNewElement && component.events.set(element, new Map());
  component.events.get(element)?.set(eventName, handler);
  isNewEventName && addDelegatedEvent(component, eventName, rootSelector);
}

// Delete all non-existent dom elements from the component registry
export function cleanupDelegatedEvents(rootSelector: string): void {
  const component = componentRegistry(rootSelector);
  for (const [element] of component.events) {
    !document.contains(element) && component.events.delete(element);
  }
}

// Remove all delegated events
// WHERE DO WE CALL THIS????
export function removeDelegatedListeners(rootSelector: string) {
  const rootElement = getRootElement(rootSelector);
  const component = componentRegistry(rootSelector);
  component.eventNames.forEach((eventName) => {
    component.rootListeners.forEach((listener) => {
      rootElement.removeEventListener(eventName, listener);
    });
  });
}

// Swap component registry events from one element to another
export function replaceEvents(
  currentNode: HTMLElement,
  newNode: HTMLElement,
  rootSelector: string
) {
  const component = componentRegistry(rootSelector);
  const oldEvents = component.events.get(currentNode);
  const newEvents = component.events.get(newNode);
  if (newEvents) {
    for (const [eventName, handler] of newEvents) {
      oldEvents?.set(eventName, handler);
    }
  }
}

// Add a delegated event to the rootSelector element
function addDelegatedEvent(
  component: ComponentRegistryItem,
  eventName: string,
  rootSelector: string
) {
  const listener = (event: Event) => {
    const target = event.target as HTMLElement;
    const handlers = component.events.get(target);
    const handler = handlers?.get(eventName);
    handler && handler(event);
  };
  component.eventNames.add(eventName);
  component.rootListeners.add(listener);
  const rootElement = getRootElement(rootSelector);
  rootElement.addEventListener(eventName, listener);
}
