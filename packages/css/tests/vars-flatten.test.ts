import { describe, expect, test, beforeEach } from "bun:test";
import { resetTestState, getStylesheet } from "@utils/test-helpers.js";
import { vars } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

describe("vars flatten", () => {
  test("nested function resolves during flatten", () => {
    const varsObj = vars({
      theme: {
        color: () => "blue",
      }
    });
    expect(varsObj.theme.color).toBe("var(--theme-color)");
  });

  test("mixed static and function values deep in nesting", () => {
    const varsObj = vars({
      a: {
        b: {
          c: "static",
          d: () => "dynamic",
        }
      }
    });
    expect(varsObj.a.b.c).toBe("var(--a-b-c)");
    expect(varsObj.a.b.d).toBe("var(--a-b-d)");
  });

  test("static nested object flattens with dot-to-hyphen keys", () => {
    vars({ a: { b: 1 } });
    const varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--a-b:1");
  });
});
