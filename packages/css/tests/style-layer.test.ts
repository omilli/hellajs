import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { resetTestState, suppressConsole } from "@utils/test-helpers.js";
import { style, removeStyle, cssText } from "@hellajs/css/bundle";

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

describe("style layer", () => {
  test("layer wraps the class rule text without changing the class name", () => {
    const obj = { color: "red" };
    const bare = style(obj);
    const layered = style(obj, { layer: "hella" });

    expect(layered).toBe(bare);
    expect(cssText()).toBe(`.${bare}{color:red}@layer hella{.${bare}{color:red}}`);
  });

  test("a label and layer bag reads as options, not an override", () => {
    const obj = { padding: "4px" };
    const labeled = style(obj, { label: "btn" });
    const layered = style(obj, { label: "btn", layer: "hella" });

    expect(layered).toBe(labeled);
    expect(cssText()).toBe(`.${labeled}{padding:4px}@layer hella{.${labeled}{padding:4px}}`);
  });

  test("removeStyle with the same options drops the layered registration", () => {
    const obj = { color: "red" };
    style(obj, { layer: "hella" });
    expect(cssText()).not.toBe("");

    removeStyle(obj, { layer: "hella" });
    expect(cssText()).toBe("");
  });
});
