import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { css, style, vars, keyframes, cssText, resetCss, resetVars } from "@hellajs/css/bundle";

// Head children ids restricted to the two sheet elements — canonical order
// is `hella-css` then `hella-vars` regardless of first-write order.
const sheetIds = () =>
  Array.from(document.head.children, (el) => el.id).filter((id) => id === "hella-css" || id === "hella-vars");

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

  test("hoists a statement registration ahead of braced-only text", () => {
    // happy-dom rejects statement inserts (a warn; css-at-rules suppresses it
    // file-wide), so the collector ordering is asserted via the server text
    // return — cssText() reads the same registration map on both platforms.
    const savedDocument = globalThis.document;
    let text: string;
    (globalThis as unknown as Record<string, unknown>).document = undefined;
    try {
      css({ body: { margin: 0 } });
      css({ "@import": 'url("x.css")' });
      text = cssText();
    } finally {
      (globalThis as unknown as Record<string, unknown>).document = savedDocument;
    }
    expect(text).toBe('@import url("x.css");body{margin:0px}');
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

  test("places hella-css before hella-vars when vars registers first", () => {
    vars({ a: 1 });
    css({ body: { margin: 0 } });

    expect(sheetIds()).toEqual(["hella-css", "hella-vars"]);
    expect(cssText()).toBe("body{margin:0px}:root{--a:1}");
  });

  test("keeps hella-css first when css registers before vars", () => {
    css({ body: { margin: 0 } });
    vars({ a: 1 });

    expect(sheetIds()).toEqual(["hella-css", "hella-vars"]);
  });

  test("preserves canonical order when vars registers first and resets", () => {
    vars({ a: 1 });
    resetVars();
    css({ body: { margin: 0 } });

    expect(sheetIds()).toEqual(["hella-css", "hella-vars"]);
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
