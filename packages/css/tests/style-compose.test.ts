import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState, getStylesheet, getHostStylesheet } from "@utils/test-helpers.js";
import { style, removeStyle, cssText } from "@hellajs/css/bundle";
import { createShadowHost } from "./helpers";

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

  test("a bag-shaped second argument composes as the override when a third argument supplies options", () => {
    const host = createShadowHost();
    const composed = style({ color: "red" }, { label: "x" }, { host });

    // happy-dom ≥20.14 matches Chrome: unknown-property declarations drop at
    // parse time, so the hosted sheet reads back without the `label:x` pin.
    expect(getHostStylesheet(host)).toBe(`.${composed}{color:red}`);
    expect(document.getElementById("hella-css")).toBeNull();

    const direct = style({ color: "red", label: "x" });
    expect(composed).toBe(direct);
    // hosted registration is excluded from cssText(), so the full emission
    // (label:x included) is pinned through the same-derivation document path
    expect(cssText()).toBe(`.${direct}{color:red;label:x}`);
  });

  test("removeStyle with the same three arguments removes the hosted composition", () => {
    const host = createShadowHost();
    style({ color: "red" }, { label: "x" }, { host });

    removeStyle({ color: "red" }, { label: "x" }, { host });

    expect(getHostStylesheet(host)).toBe("");
  });

  test("a lone bag-shaped second argument still reads as the options bag", () => {
    const cls = style({ color: "red" }, { label: "x" });

    expect(cls).toMatch(/^h-x-[a-z0-9]+$/);
    expect(getStylesheet("hella-css")).toBe(`.${cls}{color:red}`);
  });
});
