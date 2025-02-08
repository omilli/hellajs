import { COMPONENT_REGISTRY } from "./dom";
import { REACTIVE_STATE } from "./reactive";
import { ROUTER_STATE } from "./router";

// Reactive
export {
  signal,
  immutable,
  batchSignals,
  isSignal,
  effect,
  computed,
  store,
  storeEffect,
  resource,
} from "./reactive";

// Router
export {
  afterNavigate,
  beforeNavigate,
  router,
  routerGuard,
  routerRedirect,
} from "./router";

// Dom
export { render, html } from "./dom";

(window as any).HELLA = {
  router: ROUTER_STATE,
  reactive: REACTIVE_STATE,
  component: COMPONENT_REGISTRY,
};
