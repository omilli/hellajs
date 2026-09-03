import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState, getStylesheet } from "@utils/test-helpers.js";
import { style } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

describe("style composition", () => {
  test("a string base prefixes the generated class verbatim", () => {
    const base = style({ color: "red" });
    const override = style({ fontWeight: "700" });
    const composed = style(base, { fontWeight: "700" });
    expect(composed).toBe(`${base} ${override}`);
    expect(getStylesheet("hella-css")).toBe(`.${base}{color:red}.${override}{font-weight:700}`);
  });

  test("an object base deep-merges into one class with the override winning", () => {
    const cls = style({ padding: "1rem", color: "red" }, { color: "blue" });
    expect(cls).toMatch(/^h-[a-z0-9]+$/);
    expect(getStylesheet("hella-css")).toBe(`.${cls}{padding:1rem;color:blue}`);
  });

  test("nested objects merge recursively under composition", () => {
    const cls = style(
      { "&:hover": { background: "white", color: "blue" } },
      { "&:hover": { color: "green" } },
    );
    expect(getStylesheet("hella-css")).toBe(`.${cls}:hover{background:white;color:green}`);
  });

  test("array values replace the base value under composition", () => {
    const cls = style({ fontFamily: ["Helvetica", "Arial"] }, { fontFamily: ["monospace"] });
    expect(getStylesheet("hella-css")).toBe(`.${cls}{font-family:monospace}`);
  });
});
