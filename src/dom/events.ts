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
  }

  ensureRootListener(root, eventName);
  registerHandler(element, eventName, handler, root);
}

export function removeEvent(
  element: HTMLElement,
  eventName: string,
  root: string
): void {
  const component = COMPONENT_REGISTRY.get(root);
  if (!component?.events.has(element)) return;

  const handlers = component.events.get(element)!;
  handlers.delete(eventName);

  if (handlers.size === 0) {
    component.events.delete(element);
  }
}

export function cleanupElementEvents(element: HTMLElement, root: string): void {
  COMPONENT_REGISTRY.get(root)?.events.delete(element);
}

function ensureRootListener(root: string, eventName: string): void {
  const component = COMPONENT_REGISTRY.get(root);
  if (!component || component.rootListeners?.has(eventName)) return;

  const rootElement = document.querySelector(root)!;
  rootElement.addEventListener(eventName, (event) => {
    handleEventBubbling(event as Event, eventName, root);
  });

  if (!component.rootListeners) {
    component.rootListeners = new Set();
  }
  component.rootListeners.add(eventName);
}

function registerHandler(
  element: HTMLElement,
  eventName: string,
  handler: EventHandler,
  root: string
): void {
  const component = COMPONENT_REGISTRY.get(root);
  if (!component) return;

  if (!component.events) {
    component.events = new Map();
  }

  if (!component.events.has(element)) {
    component.events.set(element, new Map());
  }

  component.events.get(element)!.set(eventName, handler);
}

function handleEventBubbling(
  event: Event,
  eventName: string,
  root: string
): void {
  let target = event.target as HTMLElement | null;
  if (!target || event.defaultPrevented) return;

  const path = [];
  while (target) {
    path.push(target);
    target = target.parentElement;
  }

  for (const element of path) {
    const handler = getHandler(element, eventName, root);
    if (handler) {
      handler(event);
      if (event.defaultPrevented) break;
    }
  }
}

function getHandler(
  element: HTMLElement,
  eventName: string,
  root: string
): EventHandler | undefined {
  return COMPONENT_REGISTRY.get(root)?.events.get(element)?.get(eventName);
}
