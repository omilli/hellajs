import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();

import { signal, effect, computed, batch, untracked, scope, flush } from "@hellajs/core";
import { onError } from "@hellajs/dom/bundle";

globalThis.signal = signal;
globalThis.effect = effect;
globalThis.computed = computed;
globalThis.batch = batch;
globalThis.untracked = untracked;
globalThis.flush = flush;
globalThis.scope = scope;
globalThis.onError = onError;

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

globalThis.suppressConsole = () => {
  const errors = [];
  const origError = console.error;
  console.error = (...args) => errors.push(args);
  return {
    errors,
    restore: () => { console.error = origError; }
  };
};

globalThis.setupContainer = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
};

globalThis.resetTestState = (html = '<div id="app"></div>') => {
  document.body.innerHTML = html;
  // Reset CSS - clear any dynamically added styles
  const styleElements = document.querySelectorAll('style');
  styleElements.forEach(style => style.remove());
  // Reset cache and error handlers via DOM package
  if (globalThis.onError) onError(null);
};