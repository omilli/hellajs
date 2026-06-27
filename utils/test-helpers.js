import { resetDom } from "@hellajs/dom/bundle";
import { resetCss, resetCssVars } from "@hellajs/css/bundle";
import { resetResource } from "@hellajs/resource/bundle";
import { resetRouter } from "@hellajs/router/bundle";

export function delay(val, ms) {
  if (ms !== undefined) return new Promise(r => setTimeout(() => r(val), ms));
  if (val === undefined) return Promise.resolve();
  if (typeof val === "number") return new Promise(r => setTimeout(r, val));
  return Promise.resolve(val);
}

export function suppressConsole() {
  const errors = [];
  const origError = console.error;
  console.error = (...args) => errors.push(args);
  return {
    errors,
    restore: () => { console.error = origError; }
  };
}

export function setupContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

export function resetTestState(html = '<div id="app"></div>') {
  document.body.innerHTML = html;
  resetDom();
  resetCss();
  resetCssVars();
  resetResource();
  resetRouter();
  const styles = document.querySelectorAll("style");
  let i = styles.length;
  while (i--) styles[i]?.remove();
}
