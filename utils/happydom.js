import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();

// Load core reactive primitives
import { signal, effect, computed, batch, untracked, scope, flush } from "@hellajs/core";
globalThis.signal = signal;
globalThis.effect = effect;
globalThis.computed = computed;
globalThis.batch = batch;
globalThis.untracked = untracked;
globalThis.flush = flush;
globalThis.scope = scope;
globalThis.tick = (ms) =>
  ms ? new Promise(r => setTimeout(r, ms)) : Promise.resolve();

globalThis.delay = (val, ms = 10) =>
  new Promise(r => setTimeout(() => r(val), ms));

globalThis.wait = (fn, ms = 500) =>
  new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (fn()) return resolve();
      if (Date.now() - start > ms) return reject(new Error("wait timeout"));
      setTimeout(check, 10);
    };
    check();
  });