import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { css, style, vars, keyframes, cssText, resetCss, resetVars } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

describe("cssText", () => {
  test("returns an empty string before any registration", () => {
    expect(cssText()).toBe("");
  });

  test("joins css globals and style rules in call order", () => {
    css({ body: { margin: 0 } });
    const cls = style({ color: "red" });
    css({ a: { color: "blue" } });
    expect(cssText()).toBe(`body{margin:0px}.${cls}{color:red}a{color:blue}`);
  });

  test("excludes host-qualified registrations", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    style({ color: "red" }, { host });
    const cls = style({ color: "blue" });
    expect(cssText()).toBe(`.${cls}{color:blue}`);
  });

  test("resetCss clears the css-side contribution", () => {
    style({ color: "red" });
    css({ body: { margin: 0 } });
    resetCss();
    expect(cssText()).toBe("");
  });

  test("joins css, style, keyframes, and vars text in registration order", () => {
    css({ body: { margin: 0 } });
    const theme = vars({ color: { primary: "#3b82f6" } });
    const spin = keyframes({ from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } });
    const cls = style({ animation: `${spin} 1s linear infinite` });

    expect(theme.color.primary).toBe("var(--color-primary)");
    expect(cssText()).toBe(
      `body{margin:0px}@keyframes ${spin}{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.${cls}{animation:${spin} 1s linear infinite}:root{--color-primary:#3b82f6}`
    );
  });

  test("wraps media vars in the at-rule", () => {
    vars({ bg: "#000" }, { media: "(prefers-color-scheme: dark)" });

    expect(cssText()).toBe("@media (prefers-color-scheme: dark){:root{--bg:#000}}");
  });

  test("resetVars clears the vars contribution only", () => {
    const cls = style({ color: "red" });
    vars({ bg: "#000" });

    resetVars();

    expect(cssText()).toBe(`.${cls}{color:red}`);
  });

  test("excludes hosted vars registrations", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    vars({ bg: "#000" }, { host });
    const cls = style({ color: "blue" });

    expect(cssText()).toBe(`.${cls}{color:blue}`);
  });

  test("peeks without draining", () => {
    const cls = style({ color: "red" });
    const first = cssText();
    const second = cssText();
    expect(second).toBe(first);
    expect(first).toBe(`.${cls}{color:red}`);
  });
});
