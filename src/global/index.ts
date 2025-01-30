import { COMPONENT_REGISTRY, STYLE_CACHE, STYLE_CONFIG } from "./dom";
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
  router: ROUTER_STATE,
  reactive: REACTIVE_STATE,
  components: COMPONENT_REGISTRY,
};
