import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { getStylesheet } from "@utils/test-helpers.js";
import { css, style, vars, keyframes, cssText, removeCss, removeVars, removeStyle, resetCss, resetVars } from "@hellajs/css/bundle";

let origDocument: unknown;

beforeEach(() => {
  origDocument = globalThis.document;
  (globalThis as unknown as Record<string, unknown>).document = undefined;
});

afterEach(() => {
  (globalThis as unknown as Record<string, unknown>).document = origDocument;
  resetCss();
  resetVars();
});

describe("platform-independent registration (no document)", () => {
  test("css() returns an empty string for global styles", () => {
    expect(css({ body: { margin: "0" } })).toBe("");
  });

  test("cssText() returns the exact text css() would have injected", () => {
    css({ body: { margin: 0 } });
    expect(cssText()).toBe("body{margin:0px}");
  });

  test("style() returns the class, never text", () => {
    const cls = style({ width: 5, margin: 0 }, { label: "x" });
    expect(cls).toMatch(/^h-x-[a-z0-9]+$/);
    expect(cssText()).toBe(`.${cls}{width:5px;margin:0px}`);
  });

  test("style() nesting composes under the class in cssText()", () => {
    const cls = style({
      color: "red",
      "&:hover": { color: "blue" },
    }, { label: "btn" });
    expect(cssText()).toBe(`.${cls}{color:red}.${cls}:hover{color:blue}`);
  });

  test("style() composition returns both classes and registers the override", () => {
    const card = style({ color: "red" }, { label: "card" });
    const alert = style(card, { fontWeight: "700" });
    const override = alert.slice(card.length + 1);
    expect(alert).toBe(`${card} ${override}`);
    expect(cssText()).toBe(`.${card}{color:red}.${override}{font-weight:700}`);
  });

  test("css() does not inject into the DOM", () => {
    css({ body: { margin: 0 } });
    (globalThis as unknown as Record<string, unknown>).document = origDocument;
    expect(getStylesheet("hella-css")).not.toContain("margin:0px");
  });

  test("css() throws for selector-less conditional at-rule declarations on the server too", () => {
    expect(() => css({ "@media (min-width: 1px)": { color: "red" } })).toThrow(
      '[css] conditional at-rule "@media (min-width: 1px)" contains declarations with no selector'
    );
  });

  test("css() throws for function values on the server too", () => {
    // @ts-expect-error - testing invalid input
    expect(() => css({ padding: () => "1px" })).toThrow(
      "[css] function values are not supported in css objects — use vars() for reactive values, key: padding"
    );
  });

  test("vars() returns the var() proxy with document unset", () => {
    const theme = vars({ theme: { color: "red" } });

    expect(theme.theme.color).toBe("var(--theme-color)");
    expect(cssText()).toBe(":root{--theme-color:red}");
  });

  test("vars() honors scoped and prefix options in the registered rule", () => {
    vars({ theme: { color: "blue" } }, { scoped: ".card", prefix: "app" });

    expect(cssText()).toBe(".card{--app-theme-color:blue}");
  });

  test("vars() resolves function leaves exactly once on the server", () => {
    const tracker = mock(() => "red");
    const theme = vars({ x: tracker });

    expect(theme.x).toBe("var(--x)");
    expect(cssText()).toBe(":root{--x:red}");
    expect(tracker).toHaveBeenCalledTimes(1);
  });

  test("vars() creates no effects on the server", () => {
    const color = signal("red");
    const theme = vars({ x: color });

    expect(theme.x).toBe("var(--x)");
    expect(cssText()).toBe(":root{--x:red}");

    color("blue");
    expect(cssText()).toBe(":root{--x:red}");
  });

  test("vars() does not inject into the DOM", () => {
    vars({ theme: { color: "red" } });
    (globalThis as unknown as Record<string, unknown>).document = origDocument;
    expect(getStylesheet("hella-vars")).not.toContain("--theme-color");
  });

  test("keyframes() returns the name and cssText() carries the rule", () => {
    const name = keyframes({ from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } });

    expect(name).toMatch(/^h-kf-[a-z0-9]+$/);
    expect(cssText()).toBe(`@keyframes ${name}{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`);
  });

  test("removeCss is a no-op", () => {
    expect(() => removeCss({ color: "red" })).not.toThrow();
  });

  test("removeVars is a no-op", () => {
    expect(() => removeVars({ theme: { color: "red" } })).not.toThrow();
  });

  test("removeStyle decrements the server registration without throwing", () => {
    const cls = style({ color: "red" });
    removeStyle({ color: "red" });
    expect(cssText()).toBe("");
    expect(cls).toMatch(/^h-[a-z0-9]+$/);
  });

  test("resetCss does not throw", () => {
    expect(() => resetCss()).not.toThrow();
  });

  test("resetVars does not throw", () => {
    expect(() => resetVars()).not.toThrow();
  });
});
