import { STYLE_CACHE, STYLE_CONFIG } from "./css";
import { COMPONENT_REGISTRY } from "./dom";
import { REACTIVE_STATE } from "./reactive";
import { ROUTER_STATE } from "./router";

export * from "./dom";
export * from "./reactive";
export * from "./router";
export * from "./utils";
export * from "./css";
export * from "./types";

(window as any).HELLA = {
  style: {
    cache: STYLE_CACHE,
    config: STYLE_CONFIG,
  },
  router: ROUTER_STATE,
  reactive: REACTIVE_STATE,
  component: COMPONENT_REGISTRY,
};
