import { COMPONENT_REGISTRY } from "./dom";
import { REACTIVE_STATE } from "./reactive";
import { ROUTER_STATE } from "./router";

export * from "./dom";
export * from "./reactive";
export * from "./router";
export * from "./utils";
export * from "./types";

(window as any).HELLA = {
  router: ROUTER_STATE,
  reactive: REACTIVE_STATE,
  component: COMPONENT_REGISTRY,
};
