import { resetDom } from "@hellajs/dom";
import { resetHeadless } from "@hellajs/headless";
import { resetCss, resetVars } from "@hellajs/css";
import { resetResource } from "@hellajs/resource";
import { resetRouter } from "@hellajs/router";

export function delay(val, ms) {
  if (ms !== undefined) return new Promise((r) => setTimeout(() => r(val), ms));
  if (val === undefined) return Promise.resolve();
  if (typeof val === "number") return new Promise((r) => setTimeout(r, val));
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
    restore: () => {
      console.error = origError;
      console.warn = origWarn;
    },
  };
}

export function setupContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

/**
 * Compiles JSX source through the repo's babel plugin (options forwarded — `{ target: "dom"`
 * for the imperative builder). Babel loads lazily so suites that never compile JSX pay nothing.
 * @param {string} source JSX source
 * @param {Record<string, unknown>} [options] Plugin options forwarded to `babelHellaJS`
 * @returns {Promise<string>} Transformed code
 */
export async function compileJsx(source, options) {
  const [{ default: babel }, { default: babelHellaJS }] = await Promise.all([
    import("@babel/core"),
    import("babel-plugin-hellajs"),
  ]);
  return (
    babel.transformSync(source, {
      plugins: options ? [[babelHellaJS, options]] : [[babelHellaJS]],
      configFile: false,
    })?.code ?? ""
  );
}

/**
 * Runs a babel-compiled module body in the test environment: strips its ESM import statements,
 * binding each imported name from the matching entry in `modules` (specifier → module namespace),
 * then evaluates the body and returns `returnName`. Hydration-parity harnesses use it to execute
 * the same fixture compiled at both plugin targets.
 * @param {string} code Compiled module code (`babel.transformSync(...).code`)
 * @param {Record<string, unknown>} modules Import specifier → module namespace bindings
 * @param {string} returnName Top-level binding name to return
 * @returns {unknown} The value of `returnName` after the body runs
 *
 * A `__HELLA_ARM` key on `modules` ("server" | "client") binds the same-named free variable in the
 * body — two-target fixtures use it to phase loaders/signals per module instance (each call is a
 * fresh module scope, so instance-local counters cannot tell the arms apart).
 */
export function runCompiledModule(code, modules, returnName) {
  const names = [];
  const values = [];
  names.push("__HELLA_ARM");
  values.push(modules.__HELLA_ARM ?? "client");
  const body = code.replace(
    /import\s*(?:\{([^}]*)\}\s*from\s*)?["']([^"']+)["']\s*;?/g,
    (_, specifiers, source) => {
      // A bare side-effect import (feature registration) strips without a binding — the
      // feature modules load globally with the package; only named specifiers bind.
      if (specifiers === undefined) return "";
      const mod = modules[source];
      if (!mod) throw new Error(`runCompiledModule: no module bound for "${source}"`);
      for (const spec of specifiers.split(",")) {
        const entry = spec.trim();
        if (!entry) continue;
        const aliased = entry.match(/^(\S+)\s+as\s+(\S+)$/);
        const imported = aliased ? aliased[1] : entry;
        const local = aliased ? aliased[2] : entry;
        if (!(imported in mod)) {
          throw new Error(`runCompiledModule: "${source}" has no export "${imported}"`);
        }
        names.push(local);
        values.push(mod[imported]);
      }
      return "";
    },
  );
  return new Function(...names, `"use strict";${body}\n;return ${returnName};`)(...values);
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
  resetHeadless();
  resetCss();
  resetVars();
  resetResource();
  resetRouter();
  const styles = document.querySelectorAll("style");
  let i = styles.length;
  while (i--) styles[i]?.remove();
}
