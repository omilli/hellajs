import { describe, expect, test, beforeEach } from "bun:test";
import { batch, flush, signal } from "@hellajs/core";
import { resetTestState, getStylesheet } from "@utils/test-helpers.js";
import { vars, resetVars } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

describe("vars scoped", () => {
  test("scoped vars with class selector", () => {
    const varsObj = vars({
      theme: {
        primary: "#ff0000",
        secondary: "#00ff00"
      }
    }, { scoped: ".my-component" });

    flush();
    const varsText = getStylesheet("hella-vars");
    expect(varsText).toContain(".my-component{--theme-primary:#ff0000;--theme-secondary:#00ff00}");

    expect(varsObj.theme.primary).toBe("var(--theme-primary)");
    expect(varsObj.theme.secondary).toBe("var(--theme-secondary)");
  });

  test("scoped vars with ID selector", () => {
    const varsObj = vars({
      layout: {
        padding: "20px",
        margin: "10px"
      }
    }, { scoped: "#main-content" });

    flush();
    const varsText = getStylesheet("hella-vars");
    expect(varsText).toContain("#main-content{--layout-padding:20px;--layout-margin:10px}");

    expect(varsObj.layout.padding).toBe("var(--layout-padding)");
    expect(varsObj.layout.margin).toBe("var(--layout-margin)");
  });

  test("prefixed vars", () => {
    const varsObj = vars({
      colors: {
        primary: "blue",
        accent: "orange"
      }
    }, { prefix: "comp" });

    flush();
    const varsText = getStylesheet("hella-vars");
    expect(varsText).toContain(":root{--comp-colors-primary:blue;--comp-colors-accent:orange}");

    expect(varsObj.colors.primary).toBe("var(--comp-colors-primary)");
    expect(varsObj.colors.accent).toBe("var(--comp-colors-accent)");
  });

  test("scoped and prefixed vars combined", () => {
    const varsObj = vars({
      typography: {
        size: "16px",
        weight: "bold"
      }
    }, { scoped: ".card", prefix: "ui" });

    flush();
    const varsText = getStylesheet("hella-vars");
    expect(varsText).toContain(".card{--ui-typography-size:16px;--ui-typography-weight:bold}");

    expect(varsObj.typography.size).toBe("var(--ui-typography-size)");
    expect(varsObj.typography.weight).toBe("var(--ui-typography-weight)");
  });

  test("multiple scoped vars accumulate", () => {
    vars({
      theme: { primary: "red" }
    }, { scoped: ".header" });

    vars({
      theme: { secondary: "blue" }
    }, { scoped: ".footer" });

    vars({
      layout: { padding: "10px" }
    }, { scoped: ".header" });

    flush();
    const varsText = getStylesheet("hella-vars");
    const content = varsText;

    expect(content).toContain(".header{");
    expect(content).toContain(".footer{");
    expect(content).toContain("--theme-primary:red");
    expect(content).toContain("--layout-padding:10px");
    expect(content).toContain("--theme-secondary:blue");
  });

  test("reactive scoped vars", () => {
    const color = signal("green");
    const size = signal("18px");

    vars({
      theme: { color: color },
      font: { size: size }
    }, { scoped: ".dynamic", prefix: "dyn" });

    flush();
    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain(".dynamic{--dyn-theme-color:green;--dyn-font-size:18px}");

    batch(() => {
      color("purple");
      size("22px");
    });

    flush();
    varsText = getStylesheet("hella-vars");
    expect(varsText).toContain(".dynamic{--dyn-theme-color:purple;--dyn-font-size:22px}");
  });

  test("resetVars clears all scoped variables", () => {
    vars({ theme: { primary: "red" } }, { scoped: ".comp1" });
    vars({ theme: { secondary: "blue" } }, { scoped: ".comp2" });
    vars({ layout: { margin: "10px" } });

    flush();
    let varsText = getStylesheet("hella-vars");
    expect(varsText).toContain(".comp1");
    expect(varsText).toContain(".comp2");
    expect(varsText).toContain(":root");

    resetVars();
    flush();

    varsText = getStylesheet("hella-vars");
    expect(varsText).toBe("");
  });

  test("identical options return the same cached result", () => {
    const vars1 = { theme: { primary: "red" } };
    const options1 = { scoped: ".test", prefix: "ui" };

    const result1 = vars(vars1, options1);
    const result2 = vars(vars1, options1);
    const result3 = vars(vars1, { scoped: ".test", prefix: "ui" });

    expect(result1).toBe(result2);
    expect(result1).toBe(result3);
    expect(result1.theme.primary).toBe("var(--ui-theme-primary)");
  });

  test("reactive same-ref repeat call with identical options returns the same result", () => {
    const v = { c: signal("red") };
    const a = vars(v, { scoped: ".a" });
    const b = vars(v, { scoped: ".a" });
    expect(a).toBe(b);
    flush();
    const varsText = getStylesheet("hella-vars");
    expect(varsText).toContain(".a{--c:red}");
  });

  test("reactive same-ref repeat call with differing scoped throws and writes no stray scope", () => {
    const v = { c: signal("red") };
    vars(v);
    expect(() => vars(v, { scoped: ".dark" })).toThrow("[css] vars:");
    flush();
    const varsText = getStylesheet("hella-vars");
    expect(varsText).not.toContain(".dark");
    expect(varsText).toContain(":root{--c:red}");
  });

  test("reactive same-ref repeat call with differing prefix throws", () => {
    const v = { c: signal("red") };
    vars(v);
    expect(() => vars(v, { prefix: "p" })).toThrow("[css] vars:");
    flush();
    const varsText = getStylesheet("hella-vars");
    expect(varsText).not.toContain("--p-");
  });
});
