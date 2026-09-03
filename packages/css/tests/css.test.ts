import { describe, expect, test, beforeEach } from "bun:test";
import { resetTestState, getStylesheet } from "@utils/test-helpers.js";
import { css, resetCss, removeCss } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

describe("css", () => {
  test("global by default returns empty string", () => {
    const result = css({ body: { margin: "0" } });
    expect(result).toBe("");
  });

  test("global with selector keys", () => {
    css({
      ".card": { padding: "1rem" },
      ".card-title": { fontSize: "1.25rem" },
    });
    const content = getStylesheet("hella-css");
    expect(content).toContain(".card{padding:1rem}");
    expect(content).toContain(".card-title{font-size:1.25rem}");
  });

  test("global nesting composes descendant selectors", () => {
    css({
      nav: {
        display: "flex",
        a: {
          color: "blue",
          "&:hover": { color: "red" },
        },
      },
    });
    const content = getStylesheet("hella-css");
    expect(content).toContain("nav{display:flex}");
    expect(content).toContain("nav a{color:blue}");
    expect(content).toContain("nav a:hover{color:red}");
  });

  test("multiple global styles accumulate", () => {
    css({ body: { margin: "0" } });
    css({ "*": { boxSizing: "border-box" } });
    const content = getStylesheet("hella-css");
    expect(content).toContain("body{margin:0px}");
    expect(content).toContain("*{box-sizing:border-box}");
  });

  test("removeCss with global styles", () => {
    const styles = { body: { margin: "0" } };
    css(styles);
    expect(getStylesheet("hella-css")).toContain("margin:0px");

    removeCss(styles);
    expect(getStylesheet("hella-css")).toBe("");
  });

  test("removeCss is a no-op for unknown styles", () => {
    removeCss({ color: "neveradded" });
    expect(getStylesheet("hella-css")).toBe("");
  });

  test("resetCss clears CSS rules", () => {
    css({ body: { margin: "0" } });

    let sheetText = getStylesheet("hella-css");
    expect(sheetText).toContain("margin:0px");

    resetCss();

    sheetText = getStylesheet("hella-css");
    expect(sheetText).toBe("");
  });

  describe("input validation", () => {
    test.each([null, undefined, "not-an-object", 42])("css throws on non-object input", (invalid) => {
      // @ts-expect-error - testing invalid input
      expect(() => css(invalid)).toThrow("[css] css:");
    });

    test.each([null, undefined, "not-an-object"])("removeCss throws on non-object input", (invalid) => {
      // @ts-expect-error - testing invalid input
      expect(() => removeCss(invalid)).toThrow("[css] removeCss:");
    });

    test("css throws on function values", () => {
      // @ts-expect-error - testing invalid input
      expect(() => css({ padding: () => "1px" })).toThrow(
        "[css] function values are not supported in css objects — use vars() for reactive values, key: padding"
      );
    });

    test("removeCss throws on function values", () => {
      // @ts-expect-error - testing invalid input
      expect(() => removeCss({ padding: () => "1px" })).toThrow(
        "[css] function values are not supported in css objects — use vars() for reactive values, key: padding"
      );
    });

    test("throws on function values at any nesting depth", () => {
      // @ts-expect-error - testing invalid input
      expect(() => css({ ".card": { padding: () => "1px" } })).toThrow(
        "[css] function values are not supported in css objects"
      );
      // @ts-expect-error - testing invalid input
      expect(() => css({ "@media (min-width: 1px)": { ".card": { padding: () => "1px" } } })).toThrow(
        "[css] function values are not supported in css objects"
      );
    });
  });
});
