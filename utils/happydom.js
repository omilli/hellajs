import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();

// Load core reactive primitives
import { signal, effect, computed, batch, untracked, flush } from "../packages/core/dist/core";
globalThis.signal = signal;
globalThis.effect = effect;
globalThis.computed = computed;
globalThis.batch = batch;
globalThis.untracked = untracked;
globalThis.flush = flush;