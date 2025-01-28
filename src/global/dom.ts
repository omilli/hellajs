import { EventHandler, EventHandlerMap, StyleConfig } from "../types";

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
export const DIRECT_HANDLERS = new WeakMap<
  HTMLElement,
  Map<string, EventHandler>
>();
