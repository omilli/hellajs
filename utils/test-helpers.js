import { resetDom } from "@hellajs/dom/bundle";
import { resetCss, resetVars } from "@hellajs/css/bundle";
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
  const warns = [];
  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...args) => errors.push(args);
  console.warn = (...args) => warns.push(args);
  return {
    errors,
    warns,
    restore: () => { console.error = origError; console.warn = origWarn; }
  };
}

export function setupContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

// Canonical no-space form shared by the stylesheet readers: whitespace
// collapsed around `{ }; :,`, trailing `;` before `}` stripped — the same
// form the css package inserts, so assertions read identically to the
// inserted rule text.
const squeeze = (text) => text.replace(/\s*([{};:,])\s*/g, "$1").replace(/;}/g, "}");

// Returns the live CSSOM content for a <style id> as squeezed no-space text.
// Empty string when the element or sheet is absent (server, reset, or not yet
// created).
export function getStylesheet(id) {
  const sheet = document.getElementById(id)?.sheet;
  if (!sheet) return "";
  let text = "";
  const rules = sheet.cssRules;
  let i = 0;
  const len = rules.length;
  while (i < len) text += rules[i++].cssText;
  return squeeze(text);
}

// Same canonical form for a host node (e.g. a shadow root): joins every
// <style> inside it — the css and vars sheets are separate elements per host.
export function getHostStylesheet(host) {
  const styles = host.querySelectorAll("style");
  let text = "";
  let i = 0;
  const len = styles.length;
  while (i < len) {
    const rules = styles[i++]?.sheet?.cssRules;
    if (!rules) continue;
    let j = 0;
    const rLen = rules.length;
    while (j < rLen) text += rules[j++].cssText;
  }
  return squeeze(text);
}

export function resetTestState(html = '<div id="app"></div>') {
  document.body.innerHTML = html;
  resetDom();
  resetCss();
  resetVars();
  resetResource();
  resetRouter();
  const styles = document.querySelectorAll("style");
  let i = styles.length;
  while (i--) styles[i]?.remove();
}
