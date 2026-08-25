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

// Returns the live CSSOM content for a <style id> as squeezed no-space text
// (whitespace collapsed around `{ }; :,`, trailing `;` before `}` stripped) — the
// same canonical form the css package inserts, so assertions read identically to
// the inserted rule text. Empty string when the element or sheet is absent
// (server, reset, or not yet created).
export function getStylesheet(id) {
  const sheet = document.getElementById(id)?.sheet;
  if (!sheet) return "";
  let text = "";
  const rules = sheet.cssRules;
  let i = 0;
  const len = rules.length;
  while (i < len) text += rules[i++].cssText;
  return text.replace(/\s*([{};:,])\s*/g, "$1").replace(/;}/g, "}");
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
