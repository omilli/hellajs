import { describe, expect, test, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, getStylesheet } from "@utils/test-helpers.js";
import { cssVars, removeCssVars } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

describe("removeCssVars", () => {
  test("single static call removes its vars from the stylesheet", () => {
    cssVars({ colors: { primary: "red", secondary: "blue" } });
    flush();

    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--colors-primary:red");
    expect(varsText).toContain("--colors-secondary:blue");

    removeCssVars({ colors: { primary: "red", secondary: "blue" } });
    flush();

    varsText = getStylesheet("hella-vars");
    expect(varsText).toBe("");
  });

  test("reference counting: vars persist until last reference is removed", () => {
    cssVars({ theme: { color: "red" } });
    cssVars({ theme: { color: "red" } });
    cssVars({ theme: { color: "red" } });
    flush();

    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--theme-color:red");

    removeCssVars({ theme: { color: "red" } });
    flush();
    varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--theme-color:red");

    removeCssVars({ theme: { color: "red" } });
    flush();
    varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--theme-color:red");

    removeCssVars({ theme: { color: "red" } });
    flush();
    varsText = getStylesheet("hella-vars");
    expect(varsText).toBe("");
  });

  test("reactive removal disposes the effect", () => {
    const color = signal("red");
    const vars = { primary: color };

    cssVars(vars);
    flush();
    expect(getStylesheet("hella-vars")).toContain("red");

    removeCssVars(vars);

    color("blue");
    flush();
    const varsText = getStylesheet("hella-vars");
    expect(varsText).not.toContain("blue");
    expect(varsText).toBe("");
  });

  test("shared scope: only the removed call's keys disappear", () => {
    cssVars({ theme: { primary: "red" }, spacing: { small: "8px" } });
    cssVars({ typography: { size: "16px" } });
    flush();

    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--theme-primary:red");
    expect(varsText).toContain("--spacing-small:8px");
    expect(varsText).toContain("--typography-size:16px");

    removeCssVars({ theme: { primary: "red" }, spacing: { small: "8px" } });
    flush();

    varsText = getStylesheet("hella-vars");
    expect(varsText).not.toContain("--theme-primary:red");
    expect(varsText).not.toContain("--spacing-small:8px");
    expect(varsText).toContain("--typography-size:16px");
  });

  test("unknown input is a no-op", () => {
    expect(() => {
      removeCssVars({ nonexistent: "value" });
    }).not.toThrow();
  });

  test("scoped removeCssVars removes from correct scope", () => {
    cssVars({ theme: { color: "red" } }, { scoped: ".card", prefix: "ui" });
    flush();

    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain(".card{--ui-theme-color:red}");

    removeCssVars({ theme: { color: "red" } }, { scoped: ".card", prefix: "ui" });
    flush();

    varsText = getStylesheet("hella-vars");
    expect(varsText).toBe("");
  });

  test("reactive scoped removeCssVars disposes and removes keys", () => {
    const color = signal("green");
    const vars = { theme: { color } };

    cssVars(vars, { scoped: ".dynamic", prefix: "dyn" });
    flush();
    expect(getStylesheet("hella-vars")).toContain(".dynamic{--dyn-theme-color:green}");

    removeCssVars(vars, { scoped: ".dynamic", prefix: "dyn" });

    color("purple");
    flush();
    const varsText = getStylesheet("hella-vars");
    expect(varsText).toBe("");
  });

  test("multiple calls to different scopes: removing one scope leaves others intact", () => {
    cssVars({ primary: "red" }, { scoped: ".comp1" });
    cssVars({ secondary: "blue" }, { scoped: ".comp2" });
    flush();

    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain(".comp1");
    expect(varsText).toContain(".comp2");

    removeCssVars({ primary: "red" }, { scoped: ".comp1" });
    flush();

    varsText = getStylesheet("hella-vars");
    expect(varsText).not.toContain(".comp1");
    expect(varsText).toContain(".comp2");
  });

  test("removing an earlier scoped bucket leaves later buckets exactly removable", () => {
    cssVars({ a: 1 }, { scoped: ".one" });
    cssVars({ b: 2 }, { scoped: ".two" });
    flush();

    removeCssVars({ a: 1 }, { scoped: ".one" });
    flush();
    expect(getStylesheet("hella-vars")).toBe(".two{--b:2}");

    removeCssVars({ b: 2 }, { scoped: ".two" });
    flush();
    expect(getStylesheet("hella-vars")).toBe("");
  });

  test("removeCssVars at zero refs removes from cache and registry", () => {
    cssVars({ key: "value" });

    const result1 = cssVars({ key: "value" });
    expect(result1.key).toBe("var(--key)");

    removeCssVars({ key: "value" });
    removeCssVars({ key: "value" });

    const result2 = cssVars({ key: "value" });
    expect(result2.key).toBe("var(--key)");
  });

  test("reactive refCount: two calls, one remove leaves effect active", () => {
    const color = signal("red");
    const vars = { primary: color };

    cssVars(vars);
    cssVars(vars);
    flush();
    expect(getStylesheet("hella-vars")).toContain("red");

    removeCssVars(vars);
    flush();
    expect(getStylesheet("hella-vars")).toContain("red");

    color("blue");
    flush();
    expect(getStylesheet("hella-vars")).toContain("blue");

    removeCssVars(vars);
    flush();
    expect(getStylesheet("hella-vars") ?? "").toBe("");
  });

  describe("input validation", () => {
    test.each([null, undefined, "not-an-object"])("throws on non-object input", (invalid) => {
      // @ts-expect-error - testing invalid input
      expect(() => removeCssVars(invalid)).toThrow("[css] removeCssVars:");
    });
  });
});
