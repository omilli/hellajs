import { describe, expect, test, beforeEach, mock } from "bun:test";
import { batch, computed, flush, signal } from "@hellajs/core";
import { resetTestState, getStylesheet } from "@utils/test-helpers.js";
import { vars, resetVars, removeVars } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

describe("vars", () => {
  test("caching works", () => {
    const vars1 = { colors: { primary: "red" } };
    const vars2 = { colors: { primary: "red" } };

    const result1 = vars(vars1);
    const result2 = vars(vars2);

    expect(result1).toEqual(result2);
    expect(result1.colors.primary).toBe("var(--colors-primary)");
  });

  test("deep nesting", () => {
    const result = vars({ theme: { colors: { primary: { light: "#ff6b6b" } } } });
    const keys = "theme.colors.primary.light".split(".");
    let current: Record<string, unknown> = result as Record<string, unknown>;
    for (const key of keys) {
      current = current[key] as Record<string, unknown>;
    }
    expect(current as unknown).toBe("var(--theme-colors-primary-light)");
  });

  test("resetVars clears CSS variables", () => {
    const result1 = vars({ colors: { primary: "purple", secondary: "green" } });
    flush();

    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--colors-primary:purple");
    expect(varsText).toContain("--colors-secondary:green");

    resetVars();
    flush();

    varsText = getStylesheet("hella-vars");
    expect(varsText).toBe("");

    const result2 = vars({ colors: { primary: "purple", secondary: "green" } });
    flush();
    varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--colors-primary:purple");
    expect(result2).not.toBe(result1);
  });

  test("static vars work without effects", () => {
    const varsObj = vars({
      colors: { primary: "red", secondary: "blue" },
      spacing: { small: "4px", large: "16px" }
    });

    expect(varsObj.colors.primary).toBe("var(--colors-primary)");
    expect(varsObj.colors.secondary).toBe("var(--colors-secondary)");
    expect(varsObj.spacing.small).toBe("var(--spacing-small)");
    expect(varsObj.spacing.large).toBe("var(--spacing-large)");
  });

  test("reactive vars track signal dependencies", () => {
    const primaryColor = signal("red");
    const secondaryColor = signal("blue");

    vars({
      colors: {
        primary: primaryColor,
        secondary: secondaryColor
      }
    });

    flush();
    let varsText = getStylesheet("hella-vars");
    expect(varsText).toBe(":root{--colors-primary:red;--colors-secondary:blue}");

    batch(() => {
      primaryColor("green");
      secondaryColor("yellow");
    });

    flush();
    varsText = getStylesheet("hella-vars");
    expect(varsText).toBe(":root{--colors-primary:green;--colors-secondary:yellow}");
  });

  test("reactive vars return populated result immediately", () => {
    const color = signal("red");

    const varsObj = vars({
      colors: {
        primary: color,
        secondary: () => "blue",
      }
    });

    expect(varsObj.colors.primary).toBe("var(--colors-primary)");
    expect(varsObj.colors.secondary).toBe("var(--colors-secondary)");
  });

  test("mixed static and reactive vars", () => {
    const dynamicColor = signal("purple");

    vars({
      colors: {
        primary: dynamicColor,    // reactive
        secondary: "orange",      // static
        accent: "pink"           // static
      },
      spacing: "8px"            // static
    });

    flush();
    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--colors-primary:purple");
    expect(varsText).toContain("--colors-secondary:orange");
    expect(varsText).toContain("--spacing:8px");

    dynamicColor("teal");
    flush();

    varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--colors-primary:teal");
    expect(varsText).toContain("--colors-secondary:orange");
  });

  test("nested reactive dependencies", () => {
    const theme = signal("dark");
    const size = signal("large");

    const getThemeColor = () => theme() === "dark" ? "#333" : "#fff";
    const getSize = () => size() === "large" ? "20px" : "14px";

    vars({
      theme: {
        background: getThemeColor,
        text: () => theme() === "dark" ? "#fff" : "#000"
      },
      typography: {
        size: getSize
      }
    });

    flush();
    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--theme-background:#333");
    expect(varsText).toContain("--theme-text:#fff");
    expect(varsText).toContain("--typography-size:20px");

    batch(() => {
      theme("light");
      size("small");
    });

    flush();
    varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--theme-background:#fff");
    expect(varsText).toContain("--theme-text:#000");
    expect(varsText).toContain("--typography-size:14px");
  });

  test("resetVars clears reactive effects", () => {
    const color = signal("red");
    vars({ primary: color });

    flush();
    expect(getStylesheet("hella-vars")).toContain("red");

    resetVars();

    color("blue");
    flush();
    expect(getStylesheet("hella-vars")).toBe("");
  });

  test("computed signal integration", () => {
    const baseColor = signal("ff0000");
    const opacity = signal(0.8);

    const rgba = computed(() => {
      const hex = baseColor();
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity()})`;
    });

    vars({
      colors: {
        primary: rgba
      }
    });

    flush();
    let varsText = getStylesheet("hella-vars");
    expect(varsText).toBe(":root{--colors-primary:rgba(255,0,0,0.8)}");

    opacity(0.5);
    flush();

    varsText = getStylesheet("hella-vars");
    expect(varsText).toBe(":root{--colors-primary:rgba(255,0,0,0.5)}");
  });

  test("multiple vars calls accumulate instead of overwriting", () => {
    const vars1 = vars({
      theme: {
        primary: "#ff0000",
        secondary: "#00ff00"
      }
    });

    flush();
    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--theme-primary:#ff0000");
    expect(varsText).toContain("--theme-secondary:#00ff00");

    const vars2 = vars({
      spacing: {
        small: "8px",
        large: "16px"
      }
    });

    flush();
    varsText = getStylesheet("hella-vars");

    expect(varsText).toContain("--theme-primary:#ff0000");
    expect(varsText).toContain("--theme-secondary:#00ff00");
    expect(varsText).toContain("--spacing-small:8px");
    expect(varsText).toContain("--spacing-large:16px");

    expect(vars1.theme.primary).toBe("var(--theme-primary)");
    expect(vars2.spacing.small).toBe("var(--spacing-small)");
  });

  test("multiple reactive vars update independently", () => {
    const color1 = signal("red");
    const color2 = signal("blue");

    vars({
      theme: { primary: color1 }
    });

    vars({
      theme: { secondary: color2 }
    });

    flush();
    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--theme-primary:red");
    expect(varsText).toContain("--theme-secondary:blue");

    color1("green");
    flush();

    varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--theme-primary:green");
    expect(varsText).toContain("--theme-secondary:blue");

    color2("yellow");
    flush();

    varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--theme-primary:green");
    expect(varsText).toContain("--theme-secondary:yellow");

    batch(() => {
      color1("purple");
      color2("orange");
    });
    flush();

    varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--theme-primary:purple");
    expect(varsText).toContain("--theme-secondary:orange");
  });

  test("varsEffect cleanup removes individual effect", () => {
    const color = signal("red");
    const tracker = mock(() => color());

    vars({
      theme: {
        color: tracker
      }
    });

    flush();
    expect(tracker).toHaveBeenCalled();
    const initialCount = tracker.mock.calls.length;
    color("blue");
    flush();
    expect(tracker.mock.calls.length).toBeGreaterThan(initialCount);
    resetVars();
    const countAfterReset = tracker.mock.calls.length;
    color("green");
    flush();
    expect(tracker.mock.calls.length).toBe(countAfterReset);
  });

  test("LRU eviction discards oldest entry at capacity", () => {
    const first = vars({ key0: "value0" });
    const last = vars({ key99: "value99" });

    for (let i = 1; i < 99; i++) {
      vars({ [`key${i}`]: `value${i}` });
    }

    vars({ overflow: "evicted" });

    const stillCached = vars({ key99: "value99" });
    expect(stillCached).toBe(last);

    const recomputed = vars({ key0: "value0" });
    expect(recomputed).not.toBe(first);
    expect(recomputed.key0).toBe("var(--key0)");
  });

  test("LRU promotes entry on access, protecting it from eviction", () => {
    const first = vars({ key0: "value0" });
    const second = vars({ key1: "value1" });

    for (let i = 2; i < 100; i++) {
      vars({ [`key${i}`]: `value${i}` });
    }

    const promoted = vars({ key0: "value0" });
    expect(promoted).toBe(first);

    vars({ overflow: "evicted" });

    const stillCached = vars({ key0: "value0" });
    expect(stillCached).toBe(first);

    const evicted = vars({ key1: "value1" });
    expect(evicted).not.toBe(second);
    expect(evicted.key1).toBe("var(--key1)");
  });

  test("LRU eviction followed by re-registration preserves the reference count", () => {
    const varsObj = { color: "red" };
    vars(varsObj);
    vars(varsObj);

    for (let i = 1; i <= 100; i++) {
      vars({ [`k${i}`]: `v${i}` });
    }

    // Cache entry was evicted; the re-call must join the surviving refCount (2),
    // not reset it to 1.
    vars(varsObj);
    const varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("--color:red");

    removeVars(varsObj);
    expect(getStylesheet("hella-vars")).toContain("--color:red");

    removeVars(varsObj);
    removeVars(varsObj);
    expect(getStylesheet("hella-vars")).not.toContain("--color:red");
  });

  test("empty object returns empty result", () => {
    const result = vars({});
    expect(Object.keys(result)).toHaveLength(0);
    flush();
    const varsText = getStylesheet("hella-vars");
    // An empty vars object still upserts the (empty) :root scope rule.
    expect(varsText).toBe(":root{}");
  });

  describe("input validation", () => {
    test.each([null, undefined, "not-an-object"])("throws on non-object input", (invalid) => {
      // @ts-expect-error - testing invalid input
      expect(() => vars(invalid)).toThrow("[css] vars:");
    });
  });
});
