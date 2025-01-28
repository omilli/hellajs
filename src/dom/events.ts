import { DELEGATED_EVENTS, EVENT_HANDLERS } from "../global";
import { EventHandler, EventHandlerMap } from "../types";

export function handleEvent(
  el: HTMLElement,
  key: string,
  handler: EventHandler
): void {
  const eventName = normalizeEventName(key);

  if (shouldDelegate(eventName)) {
    addDelegatedHandler(el, key, handler);
  } else {
    el.addEventListener(eventName, handler);
  }
}

export function updateEventHandlers(
  el: HTMLElement,
  nextHandlers: EventHandlerMap | null | undefined
): void {
  if (!nextHandlers || Object.keys(nextHandlers).length === 0) {
    EVENT_HANDLERS.delete(el);
    return;
  }
  EVENT_HANDLERS.set(el, nextHandlers);
}

function addDelegatedHandler(
  el: HTMLElement,
  key: string,
  handler: EventHandler
): void {
  const handlers = getOrCreateHandlers(el);
  handlers[key] = handler;
  EVENT_HANDLERS.set(el, handlers);
}

function getOrCreateHandlers(el: HTMLElement): EventHandlerMap {
  return EVENT_HANDLERS.get(el) || {};
}

function normalizeEventName(key: string): string {
  return key.slice(2).toLowerCase();
}

function findHandler(
  element: HTMLElement,
  eventName: string
): EventHandler | undefined {
  const handlers = EVENT_HANDLERS.get(element);
  return handlers?.[eventName];
}

function executeHandler(handler: EventHandler, event: Event): void {
  try {
    handler(event);
  } catch (error) {
    console.error("Error executing event handler:", error);
  }
}

function handleBubbledEvent(event: Event): void {
  let currentTarget = event.target as HTMLElement;
  const eventName = `on${event.type}`;

  while (shouldContinueBubbling(currentTarget, event)) {
    const handler = findHandler(currentTarget, eventName);
    if (handler) {
      executeHandler(handler, event);
      if (isEventStopped(event)) break;
    }
    currentTarget = currentTarget.parentElement as HTMLElement;
  }
}

function shouldDelegate(eventName: string): boolean {
  return DELEGATED_EVENTS.has(eventName);
}

function shouldContinueBubbling(
  target: HTMLElement | null,
  event: Event
): boolean {
  return Boolean(target && target !== document.body && !isEventStopped(event));
}

function isEventStopped(event: Event): boolean {
  return (event as any)._stopped === true;
}

function initEventDelegation(): void {
  DELEGATED_EVENTS.forEach((eventName) => {
    document.addEventListener(eventName, handleBubbledEvent, { passive: true });
  });
}

initEventDelegation();
