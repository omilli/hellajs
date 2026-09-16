import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, suppressConsole } from "@utils/test-helpers.js";
import { vars, removeVars, cssText } from "@hellajs/css/bundle";

let sup: ReturnType<typeof suppressConsole>;

beforeEach(() => {
  resetTestState();
  // happy-dom rejects @layer insertRule, so every registration here triggers
  // the skip-with-warning path — capture instead of print.
  sup = suppressConsole();
});

afterEach(() => {
  sup.restore();
});

describe("vars layer", () => {
  test("layer wraps the scope declarations in the at-rule", () => {
    const result = vars({ bg: "#000" }, { layer: "hella" });

    expect(result).toEqual({ bg: "var(--bg)" });
    expect(cssText()).toBe("@layer hella{:root{--bg:#000}}");
  });

  test("layer composes outermost of media in the emitted text", () => {
    vars({ bg: "#000" }, { media: "(min-width: 600px)", layer: "hella" });

    flush();
    expect(cssText()).toBe("@layer hella{@media (min-width: 600px){:root{--bg:#000}}}");
  });

  test("same scope under two layers coexists and removeVars drops only its layer bucket", () => {
    const light = { bg: "#fff" };
    vars(light, { layer: "one" });
    vars({ bg: "#000" }, { layer: "two" });

    flush();
    expect(cssText()).toBe("@layer one{:root{--bg:#fff}}@layer two{:root{--bg:#000}}");

    removeVars(light, { layer: "one" });
    flush();
    expect(cssText()).toBe("@layer two{:root{--bg:#000}}");
  });

  test("reactive vars register wrapped under a layer", () => {
    const bg = signal("#111");
    vars({ bg }, { layer: "hella" });

    flush();
    expect(cssText()).toBe("@layer hella{:root{--bg:#111}}");
  });
});
