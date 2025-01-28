import {
  STYLE_CACHE,
  STYLE_CONFIG,
  DELEGATED_EVENTS,
  EVENT_HANDLERS,
} from "./dom";
import { REACTIVE_STATE } from "./reactive";
import { ROUTER_STATE } from "./router";

export * from "./dom";
export * from "./reactive";
export * from "./router";
export * from "./utils";

(window as any).HELLA = {
  style: {
    cache: STYLE_CACHE,
    config: STYLE_CONFIG,
  },
  events: {
    delegated: DELEGATED_EVENTS,
    handlers: EVENT_HANDLERS,
  },
  router: ROUTER_STATE,
  reactive: REACTIVE_STATE,
};
