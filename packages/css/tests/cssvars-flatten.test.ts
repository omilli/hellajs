import { describe, expect, test, beforeEach } from "bun:test";
import { resetTestState, getStylesheet } from "@utils/test-helpers.js";
import { cssVars } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

describe("cssVars flatten", () => {
  test("nested function resolves during flatten", () => {
    const vars = cssVars({
      theme: {
        color: () => "blue",
      }
    });
    expect(vars.theme.color).toBe("var(--theme-color)");
  });

  test("mixed static and function values deep in nesting", () => {
    const vars = cssVars({
      a: {
        b: {
          c: "static",
          d: () => "dynamic",
        }
      }
    });
    expect(vars.a.b.c).toBe("var(--a-b-c)");
    expect(vars.a.b.d).toBe("var(--a-b-d)");
  });

  test("static nested object flattens with dot-to-hyphen keys", () => {
    cssVars({ a: { b: 1 } });
    const varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--a-b:1");
  });
});
