import { componentRegistry } from "./render.global";
import { EventHandlerArgs, DelegatedEventArgs } from "./render.types";
import { getRootElement } from "./render.utils";
import { toError } from "../global";

/**
 * Attaches event with delegation and security checks
 */
export function attachEvent({
  element,
  eventName,
  handler,
  rootSelector,
}: EventHandlerArgs): void {
  /* Validates DOM element before attaching events */
  if (!element || !(element instanceof HTMLElement)) {
    throw toError("Invalid event target");
  }

  /* Sets up event delegation and caching */
  const component = componentRegistry(rootSelector);
  const elementEvents = component.events.get(element) || new Map();

  !component.events.has(element) &&
    component.events.set(element, elementEvents);
  !component.eventNames.has(eventName) &&
    addDelegatedEvent({ component, eventName, rootSelector });

  elementEvents.set(eventName, handler);
}

/**
 * Removes orphaned event listeners for better memory management
 */
export function cleanupDelegatedEvents(rootSelector: string): void {
  const component = componentRegistry(rootSelector);
  const deadElements = new Set<HTMLElement>();

  component.events.forEach((_, element) => {
    !document.contains(element) && deadElements.add(element);
  });

  deadElements.forEach((element) => component.events.delete(element));
}

/**
 * Safely removes all event listeners from root
 */
export function removeDelegatedListeners(rootSelector: string): void {
  const root = getRootElement(rootSelector);
  const component = componentRegistry(rootSelector);

  if (!root || !component) return;

  component.rootListeners.forEach((listener) => {
    component.eventNames.forEach((eventName) => {
      root.removeEventListener(eventName, listener);
    });
  });
}

/**
 * Efficiently transfers events between nodes
 */
export function replaceEvents(
  currentNode: HTMLElement,
  newNode: HTMLElement,
  rootSelector: string
): void {
  const component = componentRegistry(rootSelector);
  const oldEvents = component.events.get(currentNode);
  const newEvents = component.events.get(newNode);

  if (!oldEvents || !newEvents) return;

  newEvents.forEach((handler, eventName) => {
    oldEvents.set(eventName, handler);
  });
}

/**
 * Sets up event delegation with capturing
 */
function addDelegatedEvent({
  component,
  eventName,
  rootSelector,
}: DelegatedEventArgs): void {
  /* Creates event delegation handler with security checks */
  const listener = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLElement)) return;

    const handler = component.events.get(target)?.get(eventName);
    handler?.(event);
  };

  component.eventNames.add(eventName);
  component.rootListeners.add(listener);

  const root = getRootElement(rootSelector);
  root.addEventListener(eventName, listener, { capture: true });
}
