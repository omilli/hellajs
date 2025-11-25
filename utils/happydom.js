import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();

// Load core reactive primitives
import { signal, effect, computed, batch, untracked, scope } from "../packages/core/";
import { flush } from "../packages/core/lib/reactivity/scheduler";
globalThis.signal = signal;
globalThis.effect = effect;
globalThis.computed = computed;
globalThis.batch = batch;
globalThis.untracked = untracked;
globalThis.flush = flush;
globalThis.scope = scope;