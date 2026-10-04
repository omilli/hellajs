import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { getStylesheet, resetTestState } from "@utils/test-helpers.js";
import { css, style, vars, keyframes, cssText, removeCss, removeVars, removeStyle, resetCss, resetVars } from "@hellajs/css/bundle";

let origDocument: unknown;

beforeEach(() => {
  resetTestState();
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
    expect(cssText()).toBe("body {\n  margin: 0px;\n}");
  });

  test("style() returns the class, never text", () => {
    const cls = style({ width: 5, margin: 0 }, { label: "x" });
    expect(cls).toMatch(/^x-[a-z]+$/);
    expect(cssText()).toBe(`.${cls} {\n  width: 5px;\n  margin: 0px;\n}`);
  });

  test("style() nesting composes under the class in cssText()", () => {
    const cls = style({
      color: "red",
      "&:hover": { color: "blue" },
    }, { label: "btn" });
    expect(cssText()).toBe(`.${cls} {\n  color: red;\n}\n.${cls}:hover {\n  color: blue;\n}`);
  });

  test("style() positional label returns the labeled class and registers the rule", () => {
    const cls = style("card", { color: "red", fontWeight: "700" });
    expect(cls).toMatch(/^card-[a-z]+$/);
    expect(cssText()).toBe(`.${cls} {\n  color: red;\n  font-weight: 700;\n}`);
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

  test("css() throws for top-level declarations on the server too", () => {
    expect(() => css({ color: "red" })).toThrow(
      "[css] top-level declarations have no selector — nest them under a selector or at-rule"
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
    expect(cssText()).toBe(":root {\n  --theme-color: red;\n}");
  });

  test("vars() honors scoped and prefix options in the registered rule", () => {
    vars({ theme: { color: "blue" } }, { scoped: ".card", prefix: "app" });

    expect(cssText()).toBe(".card {\n  --app-theme-color: blue;\n}");
  });

  test("vars() resolves function leaves exactly once on the server", () => {
    const tracker = mock(() => "red");
    const theme = vars({ x: tracker });

    expect(theme.x).toBe("var(--x)");
    expect(cssText()).toBe(":root {\n  --x: red;\n}");
    expect(tracker).toHaveBeenCalledTimes(1);
  });

  test("vars() creates no effects on the server", () => {
    const color = signal("red");
    const theme = vars({ x: color });

    expect(theme.x).toBe("var(--x)");
    expect(cssText()).toBe(":root {\n  --x: red;\n}");

    color("blue");
    expect(cssText()).toBe(":root {\n  --x: red;\n}");
  });

  test("vars() does not inject into the DOM", () => {
    vars({ theme: { color: "red" } });
    (globalThis as unknown as Record<string, unknown>).document = origDocument;
    expect(getStylesheet("hella-vars")).not.toContain("--theme-color");
  });

  test("keyframes() returns the name and cssText() carries the rule", () => {
    const name = keyframes({ from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } });

    expect(name).toMatch(/^kf-[a-z]+$/);
    expect(cssText()).toBe(`@keyframes ${name} {\n  from {\n    transform: rotate(0deg);\n  }\n  to {\n    transform: rotate(360deg);\n  }\n}`);
  });

  test("removeCss decrements the server registration", () => {
    css({ body: { margin: 0 } });
    expect(cssText()).toBe("body {\n  margin: 0px;\n}");

    removeCss({ body: { margin: 0 } });
    expect(cssText()).toBe("");
  });

  test("removeVars decrements the server static registration", () => {
    vars({ theme: { color: "red" } });
    expect(cssText()).toBe(":root {\n  --theme-color: red;\n}");

    removeVars({ theme: { color: "red" } });
    expect(cssText()).toBe("");
  });

  test("removeVars decrements the server reactive registration", () => {
    const color = signal("red");
    const theme = { color };
    vars(theme);
    expect(cssText()).toBe(":root {\n  --color: red;\n}");

    removeVars(theme);
    expect(cssText()).toBe("");

    // No effect existed on the server — a signal write must not re-add it.
    color("blue");
    expect(cssText()).toBe("");
  });

  test("reactive same-ref differing options throws on the server too", () => {
    const color = signal("red");
    const theme = { color };
    vars(theme, { scoped: ".a" });

    expect(() => vars(theme, { scoped: ".b" })).toThrow(
      "[css] vars: reactive vars object already registered with different options"
    );
    expect(cssText()).toBe(".a {\n  --color: red;\n}");
  });

  test("removeStyle decrements the server registration without throwing", () => {
    const cls = style({ color: "red" });
    expect(cssText()).toContain(`.${cls} {`);
    removeStyle({ color: "red" });
    expect(cssText()).toBe("");
    expect(cls).toMatch(/^[a-z]+$/);
  });

  test("resetCss does not throw", () => {
    expect(() => resetCss()).not.toThrow();
  });

  test("resetVars does not throw", () => {
    expect(() => resetVars()).not.toThrow();
  });
});
