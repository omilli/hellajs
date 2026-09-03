import { describe, expect, test, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, getStylesheet } from "@utils/test-helpers.js";
import { vars, removeVars } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

describe("removeVars", () => {
  test("single static call removes its vars from the stylesheet", () => {
    vars({ colors: { primary: "red", secondary: "blue" } });
    flush();

    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--colors-primary:red");
    expect(varsText).toContain("--colors-secondary:blue");

    removeVars({ colors: { primary: "red", secondary: "blue" } });
    flush();

    varsText = getStylesheet("hella-vars");
    expect(varsText).toBe("");
  });

  test("reference counting: vars persist until last reference is removed", () => {
    vars({ theme: { color: "red" } });
    vars({ theme: { color: "red" } });
    vars({ theme: { color: "red" } });
    flush();

    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--theme-color:red");

    removeVars({ theme: { color: "red" } });
    flush();
    varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--theme-color:red");

    removeVars({ theme: { color: "red" } });
    flush();
    varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--theme-color:red");

    removeVars({ theme: { color: "red" } });
    flush();
    varsText = getStylesheet("hella-vars");
    expect(varsText).toBe("");
  });

  test("reactive removal disposes the effect", () => {
    const color = signal("red");
    const varsObj = { primary: color };

    vars(varsObj);
    flush();
    expect(getStylesheet("hella-vars")).toContain("red");

    removeVars(varsObj);

    color("blue");
    flush();
    const varsText = getStylesheet("hella-vars");
    expect(varsText).not.toContain("blue");
    expect(varsText).toBe("");
  });

  test("shared scope: only the removed call's keys disappear", () => {
    vars({ theme: { primary: "red" }, spacing: { small: "8px" } });
    vars({ typography: { size: "16px" } });
    flush();

    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--theme-primary:red");
    expect(varsText).toContain("--spacing-small:8px");
    expect(varsText).toContain("--typography-size:16px");

    removeVars({ theme: { primary: "red" }, spacing: { small: "8px" } });
    flush();

    varsText = getStylesheet("hella-vars");
    expect(varsText).not.toContain("--theme-primary:red");
    expect(varsText).not.toContain("--spacing-small:8px");
    expect(varsText).toContain("--typography-size:16px");
  });

  test("unknown input is a no-op", () => {
    expect(() => {
      removeVars({ nonexistent: "value" });
    }).not.toThrow();
  });

  test("scoped removeVars removes from correct scope", () => {
    vars({ theme: { color: "red" } }, { scoped: ".card", prefix: "ui" });
    flush();

    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain(".card{--ui-theme-color:red}");

    removeVars({ theme: { color: "red" } }, { scoped: ".card", prefix: "ui" });
    flush();

    varsText = getStylesheet("hella-vars");
    expect(varsText).toBe("");
  });

  test("reactive scoped removeVars disposes and removes keys", () => {
    const color = signal("green");
    const varsObj = { theme: { color } };

    vars(varsObj, { scoped: ".dynamic", prefix: "dyn" });
    flush();
    expect(getStylesheet("hella-vars")).toContain(".dynamic{--dyn-theme-color:green}");

    removeVars(varsObj, { scoped: ".dynamic", prefix: "dyn" });

    color("purple");
    flush();
    const varsText = getStylesheet("hella-vars");
    expect(varsText).toBe("");
  });

  test("multiple calls to different scopes: removing one scope leaves others intact", () => {
    vars({ primary: "red" }, { scoped: ".comp1" });
    vars({ secondary: "blue" }, { scoped: ".comp2" });
    flush();

    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain(".comp1");
    expect(varsText).toContain(".comp2");

    removeVars({ primary: "red" }, { scoped: ".comp1" });
    flush();

    varsText = getStylesheet("hella-vars");
    expect(varsText).not.toContain(".comp1");
    expect(varsText).toContain(".comp2");
  });

  test("removing an earlier scoped bucket leaves later buckets exactly removable", () => {
    vars({ a: 1 }, { scoped: ".one" });
    vars({ b: 2 }, { scoped: ".two" });
    flush();

    removeVars({ a: 1 }, { scoped: ".one" });
    flush();
    expect(getStylesheet("hella-vars")).toBe(".two{--b:2}");

    removeVars({ b: 2 }, { scoped: ".two" });
    flush();
    expect(getStylesheet("hella-vars")).toBe("");
  });

  test("removeVars at zero refs removes from cache and registry", () => {
    vars({ key: "value" });

    const result1 = vars({ key: "value" });
    expect(result1.key).toBe("var(--key)");

    removeVars({ key: "value" });
    removeVars({ key: "value" });

    const result2 = vars({ key: "value" });
    expect(result2.key).toBe("var(--key)");
  });

  test("reactive refCount: two calls, one remove leaves effect active", () => {
    const color = signal("red");
    const varsObj = { primary: color };

    vars(varsObj);
    vars(varsObj);
    flush();
    expect(getStylesheet("hella-vars")).toContain("red");

    removeVars(varsObj);
    flush();
    expect(getStylesheet("hella-vars")).toContain("red");

    color("blue");
    flush();
    expect(getStylesheet("hella-vars")).toContain("blue");

    removeVars(varsObj);
    flush();
    expect(getStylesheet("hella-vars") ?? "").toBe("");
  });

  describe("input validation", () => {
    test.each([null, undefined, "not-an-object"])("throws on non-object input", (invalid) => {
      // @ts-expect-error - testing invalid input
      expect(() => removeVars(invalid)).toThrow("[css] removeVars:");
    });
  });
});
