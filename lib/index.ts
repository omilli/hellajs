import { HELLA_COMPONENTS } from "./render";
import { HELLA_REACTIVE } from "./reactive";
import { HELLA_RESOURCE } from "./resource";
import { HELLA_ROUTER } from "./router";
import { HELLA_STORES } from "./store";

// Reactive
export { signal, batchSignals, effect, computed } from "./reactive";

// Store
export { store } from "./store";

// Resource
export { resource } from "./resource";

// Router
export { afterNavigate, beforeNavigate, router } from "./router";

// Dom
export { render, html } from "./render";

export * from "./global/global.types";
export * from "./reactive/reactive.types";
export * from "./store/store.types";
export * from "./resource/resource.types";
export * from "./router/router.types";
export * from "./render/render.types";

(window as any).HELLA = {
  router: HELLA_ROUTER,
  reactive: HELLA_REACTIVE,
  component: HELLA_COMPONENTS,
  resource: HELLA_RESOURCE,
  store: HELLA_STORES,
};
