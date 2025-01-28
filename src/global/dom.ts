import { EventHandlerMap, StyleConfig } from "../types";

export const STYLE_CACHE = {
  scoped: new Map<string, string>(),
  global: new Map<string, string>(),
};

export const STYLE_CONFIG: StyleConfig = {
  scope: "scoped",
  sizeTo: "px",
};

export const DELEGATED_EVENTS = new Set([
  "click",
  "input",
  "change",
  "submit",
  "focus",
  "blur",
  "mouseenter",
  "mouseleave",
  "mouseover",
  "mouseout",
]);

export const EVENT_HANDLERS = new WeakMap<HTMLElement, EventHandlerMap>();

(window as any).HELLA_STYLE_CACHE = STYLE_CACHE;
(window as any).HELLA_STYLE_CONFIG = STYLE_CONFIG;
(window as any).HELLA_DELEGATED_EVENTS = DELEGATED_EVENTS;
(window as any).HELLA_EVENT_HANDLERS = EVENT_HANDLERS;
