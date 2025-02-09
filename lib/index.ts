import { COMPONENT_REGISTRY } from "./dom";
import { REACTIVE_STATE } from "./reactive";
import { HELLA_ROUTER } from "./router";
import { HELLA_STORES } from "./store";

// Reactive
export {
  signal,
  immutable,
  batchSignals,
  isSignal,
  effect,
  computed,
  resource,
} from "./reactive";

// Store
export { store } from "./store";

// Router
export { afterNavigate, beforeNavigate, router } from "./router";

// Dom
export { render, html } from "./dom";

(window as any).HELLA = {
  router: HELLA_ROUTER,
  reactive: REACTIVE_STATE,
  component: COMPONENT_REGISTRY,
  store: HELLA_STORES,
};
