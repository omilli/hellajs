import { describe, expect, test, beforeEach } from "bun:test";
import { cssVars, cssVarsRemove, cssReset, cssVarsReset } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
  cssReset();
  cssVarsReset();
});

describe("cssVars", () => {
  test("caching works", () => {
    const vars1 = { colors: { primary: 'red' } };
    const vars2 = { colors: { primary: 'red' } };

    const result1 = cssVars(vars1);
    const result2 = cssVars(vars2);

    expect(result1).toEqual(result2);
    expect(result1.colors.primary).toBe('var(--colors-primary)');
  });

  test("deep nesting", () => {
    const result = cssVars({ theme: { colors: { primary: { light: '#ff6b6b' } } } });
    const keys = 'theme.colors.primary.light'.split('.');
    let current: Record<string, unknown> = result as Record<string, unknown>;
    for (const key of keys) {
      current = current[key] as Record<string, unknown>;
    }
    expect(current as unknown).toBe('var(--theme-colors-primary-light)');
  });

  test("cssVarsReset clears CSS variables", async () => {
    const result1 = cssVars({ colors: { primary: 'purple', secondary: 'green' } });
    await flush();

    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain('--colors-primary: purple');
    expect(varsEl?.textContent).toContain('--colors-secondary: green');

    cssVarsReset();
    await flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toBe('');

    const result2 = cssVars({ colors: { primary: 'purple', secondary: 'green' } });
    await flush();
    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain('--colors-primary: purple');
    expect(result2).not.toBe(result1);
  });

  test("static vars work without effects", () => {
    const vars = cssVars({
      colors: { primary: 'red', secondary: 'blue' },
      spacing: { small: '4px', large: '16px' }
    });

    expect(vars.colors.primary).toBe('var(--colors-primary)');
    expect(vars.colors.secondary).toBe('var(--colors-secondary)');
    expect(vars.spacing.small).toBe('var(--spacing-small)');
    expect(vars.spacing.large).toBe('var(--spacing-large)');
  });

  test("reactive vars track signal dependencies", async () => {
    const primaryColor = signal('red');
    const secondaryColor = signal('blue');

    cssVars({
      colors: {
        primary: primaryColor,
        secondary: secondaryColor
      }
    });

    await flush();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toBe(":root{--colors-primary: red;--colors-secondary: blue;}");

    batch(() => {
      primaryColor('green');
      secondaryColor('yellow');
    });

    await flush();
    varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toBe(":root{--colors-primary: green;--colors-secondary: yellow;}");
  });

  test("reactive vars return populated result immediately", () => {
    const color = signal('red');

    const vars = cssVars({
      colors: {
        primary: color,
        secondary: () => 'blue',
      }
    });

    expect(vars.colors.primary).toBe('var(--colors-primary)');
    expect(vars.colors.secondary).toBe('var(--colors-secondary)');
  });

  test("mixed static and reactive vars", async () => {
    const dynamicColor = signal('purple');

    cssVars({
      colors: {
        primary: dynamicColor,    // reactive
        secondary: 'orange',      // static
        accent: 'pink'           // static
      },
      spacing: '8px'            // static
    });

    await flush();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain('--colors-primary: purple');
    expect(varsEl?.textContent).toContain('--colors-secondary: orange');
    expect(varsEl?.textContent).toContain('--spacing: 8px');

    dynamicColor('teal');
    await flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain('--colors-primary: teal');
    expect(varsEl?.textContent).toContain('--colors-secondary: orange');
  });

  test("nested reactive dependencies", async () => {
    const theme = signal('dark');
    const size = signal('large');

    const getThemeColor = () => theme() === 'dark' ? '#333' : '#fff';
    const getSize = () => size() === 'large' ? '20px' : '14px';

    cssVars({
      theme: {
        background: getThemeColor,
        text: () => theme() === 'dark' ? '#fff' : '#000'
      },
      typography: {
        size: getSize
      }
    });

    await flush();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain('--theme-background: #333');
    expect(varsEl?.textContent).toContain('--theme-text: #fff');
    expect(varsEl?.textContent).toContain('--typography-size: 20px');

    batch(() => {
      theme('light');
      size('small');
    });

    await flush();
    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain('--theme-background: #fff');
    expect(varsEl?.textContent).toContain('--theme-text: #000');
    expect(varsEl?.textContent).toContain('--typography-size: 14px');
  });

  test("cssVarsReset clears reactive effects", async () => {
    const color = signal('red');
    cssVars({ primary: color });

    await flush();
    expect(document.getElementById("hella-vars")?.textContent).toContain('red');

    cssVarsReset();

    color('blue');
    await flush();
    expect(document.getElementById("hella-vars")?.textContent).toBe('');
  });

  test("computed signal integration", async () => {
    const baseColor = signal('ff0000');
    const opacity = signal(0.8);

    const rgba = computed(() => {
      const hex = baseColor();
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity()})`;
    });

    cssVars({
      colors: {
        primary: rgba
      }
    });

    await flush();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toBe(":root{--colors-primary: rgba(255, 0, 0, 0.8);}");

    opacity(0.5);
    await flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toBe(":root{--colors-primary: rgba(255, 0, 0, 0.5);}");
  });

  test("multiple cssVars calls accumulate instead of overwriting", async () => {
    const vars1 = cssVars({
      theme: {
        primary: "#ff0000",
        secondary: "#00ff00"
      }
    });

    await flush();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("--theme-primary: #ff0000");
    expect(varsEl?.textContent).toContain("--theme-secondary: #00ff00");

    const vars2 = cssVars({
      spacing: {
        small: "8px",
        large: "16px"
      }
    });

    await flush();
    varsEl = document.getElementById("hella-vars");

    expect(varsEl?.textContent).toContain("--theme-primary: #ff0000");
    expect(varsEl?.textContent).toContain("--theme-secondary: #00ff00");
    expect(varsEl?.textContent).toContain("--spacing-small: 8px");
    expect(varsEl?.textContent).toContain("--spacing-large: 16px");

    expect(vars1.theme.primary).toBe("var(--theme-primary)");
    expect(vars2.spacing.small).toBe("var(--spacing-small)");
  });

  test("multiple reactive cssVars update independently", async () => {
    const color1 = signal("red");
    const color2 = signal("blue");

    cssVars({
      theme: { primary: color1 }
    });

    cssVars({
      theme: { secondary: color2 }
    });

    await flush();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("--theme-primary: red");
    expect(varsEl?.textContent).toContain("--theme-secondary: blue");

    color1("green");
    await flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("--theme-primary: green");
    expect(varsEl?.textContent).toContain("--theme-secondary: blue");

    color2("yellow");
    await flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("--theme-primary: green");
    expect(varsEl?.textContent).toContain("--theme-secondary: yellow");

    batch(() => {
      color1("purple");
      color2("orange");
    });
    await flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("--theme-primary: purple");
    expect(varsEl?.textContent).toContain("--theme-secondary: orange");
  });

  test("scoped cssVars with class selector", async () => {
    const vars = cssVars({
      theme: {
        primary: "#ff0000",
        secondary: "#00ff00"
      }
    }, { scoped: ".my-component" });

    await flush();
    const varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain(".my-component{--theme-primary: #ff0000;--theme-secondary: #00ff00;}");

    expect(vars.theme.primary).toBe("var(--theme-primary)");
    expect(vars.theme.secondary).toBe("var(--theme-secondary)");
  });

  test("scoped cssVars with ID selector", async () => {
    const vars = cssVars({
      layout: {
        padding: "20px",
        margin: "10px"
      }
    }, { scoped: "#main-content" });

    await flush();
    const varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("#main-content{--layout-padding: 20px;--layout-margin: 10px;}");

    expect(vars.layout.padding).toBe("var(--layout-padding)");
    expect(vars.layout.margin).toBe("var(--layout-margin)");
  });

  test("prefixed cssVars", async () => {
    const vars = cssVars({
      colors: {
        primary: "blue",
        accent: "orange"
      }
    }, { prefix: "comp" });

    await flush();
    const varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain(":root{--comp-colors-primary: blue;--comp-colors-accent: orange;}");

    expect(vars.colors.primary).toBe("var(--comp-colors-primary)");
    expect(vars.colors.accent).toBe("var(--comp-colors-accent)");
  });

  test("scoped and prefixed cssVars combined", async () => {
    const vars = cssVars({
      typography: {
        size: "16px",
        weight: "bold"
      }
    }, { scoped: ".card", prefix: "ui" });

    await flush();
    const varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain(".card{--ui-typography-size: 16px;--ui-typography-weight: bold;}");

    expect(vars.typography.size).toBe("var(--ui-typography-size)");
    expect(vars.typography.weight).toBe("var(--ui-typography-weight)");
  });

  test("multiple scoped cssVars accumulate", async () => {
    cssVars({
      theme: { primary: "red" }
    }, { scoped: ".header" });

    cssVars({
      theme: { secondary: "blue" }
    }, { scoped: ".footer" });

    cssVars({
      layout: { padding: "10px" }
    }, { scoped: ".header" });

    await flush();
    const varsEl = document.getElementById("hella-vars");
    const content = varsEl!.textContent;

    expect(content).toContain(".header{");
    expect(content).toContain(".footer{");
    expect(content).toContain("--theme-primary: red");
    expect(content).toContain("--layout-padding: 10px");
    expect(content).toContain("--theme-secondary: blue");
  });

  test("reactive scoped cssVars", async () => {
    const color = signal("green");
    const size = signal("18px");

    cssVars({
      theme: { color: color },
      font: { size: size }
    }, { scoped: ".dynamic", prefix: "dyn" });

    await flush();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain(".dynamic{--dyn-theme-color: green;--dyn-font-size: 18px;}");

    batch(() => {
      color("purple");
      size("22px");
    });

    await flush();
    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain(".dynamic{--dyn-theme-color: purple;--dyn-font-size: 22px;}");
  });

  test("cssVarsReset clears all scoped variables", async () => {
    cssVars({ theme: { primary: "red" } }, { scoped: ".comp1" });
    cssVars({ theme: { secondary: "blue" } }, { scoped: ".comp2" });
    cssVars({ layout: { margin: "10px" } });

    await flush();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain(".comp1");
    expect(varsEl?.textContent).toContain(".comp2");
    expect(varsEl?.textContent).toContain(":root");

    cssVarsReset();
    await flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toBe('');
  });

  test("options caching works correctly", () => {
    const vars1 = { theme: { primary: "red" } };
    const options1 = { scoped: ".test", prefix: "ui" };

    const result1 = cssVars(vars1, options1);
    const result2 = cssVars(vars1, options1);
    const result3 = cssVars(vars1, { scoped: ".test", prefix: "ui" });

    expect(result1).toBe(result2);
    expect(result1).toBe(result3);
    expect(result1.theme.primary).toBe("var(--ui-theme-primary)");
  });

  test("varsEffect cleanup removes individual effect", async () => {
    const color = signal("red");
    let runCount = 0;

    cssVars({
      theme: {
        color: () => {
          runCount++;
          return color();
        }
      }
    });

    await flush();
    expect(runCount).toBeGreaterThan(0);
    const initialCount = runCount;

    color("blue");
    await flush();
    expect(runCount).toBeGreaterThan(initialCount);

    cssVarsReset();
    const countAfterReset = runCount;

    color("green");
    await flush();
    expect(runCount).toBe(countAfterReset);
  });

  test("LRU eviction discards oldest entry at capacity", () => {
    const first = cssVars({ key0: 'value0' });
    const last = cssVars({ key99: 'value99' });

    for (let i = 1; i < 99; i++) {
      cssVars({ [`key${i}`]: `value${i}` });
    }

    cssVars({ overflow: 'evicted' });

    const stillCached = cssVars({ key99: 'value99' });
    expect(stillCached).toBe(last);

    const recomputed = cssVars({ key0: 'value0' });
    expect(recomputed).not.toBe(first);
    expect(recomputed.key0).toBe('var(--key0)');
  });

  test("LRU promotes entry on access, protecting it from eviction", () => {
    const first = cssVars({ key0: 'value0' });
    const second = cssVars({ key1: 'value1' });

    for (let i = 2; i < 100; i++) {
      cssVars({ [`key${i}`]: `value${i}` });
    }

    const promoted = cssVars({ key0: 'value0' });
    expect(promoted).toBe(first);

    cssVars({ overflow: 'evicted' });

    const stillCached = cssVars({ key0: 'value0' });
    expect(stillCached).toBe(first);

    const evicted = cssVars({ key1: 'value1' });
    expect(evicted).not.toBe(second);
    expect(evicted.key1).toBe('var(--key1)');
  });

  describe("single-pass flatten", () => {
    test("static-only objects flatten with no reactive path", () => {
      const vars1 = cssVars({ colors: { primary: 'red' } });
      const vars2 = cssVars({ colors: { primary: 'red' } });

      expect(vars1).toEqual(vars2);
      expect(vars1.colors.primary).toBe('var(--colors-primary)');
    });

    test("nested function resolves during flatten", () => {
      const vars = cssVars({
        theme: {
          color: () => 'blue',
        }
      });
      expect(vars.theme.color).toBe('var(--theme-color)');
    });

    test("mixed static and function values deep in nesting", () => {
      const vars = cssVars({
        a: {
          b: {
            c: 'static',
            d: () => 'dynamic',
          }
        }
      });
      expect(vars.a.b.c).toBe('var(--a-b-c)');
      expect(vars.a.b.d).toBe('var(--a-b-d)');
    });

    test("static nested object flattens with dot-to-hyphen keys", () => {
      cssVars({ a: { b: 1 } });
      const varsEl = document.getElementById("hella-vars");
      expect(varsEl?.textContent).toContain("--a-b: 1");
    });
  });

  test("empty object returns empty result", async () => {
    const result = cssVars({});
    expect(Object.keys(result)).toHaveLength(0);
    await flush();
    const varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent ?? '').toBe('');
  });

  describe("input validation", () => {
    test.each([null, undefined, "not-an-object"])("throws on non-object input", (invalid) => {
      // @ts-expect-error - testing invalid input
      expect(() => cssVars(invalid)).toThrow("[css] cssVars:");
    });
  });

});

describe("cssVarsRemove", () => {
  test("single static call removes its vars from the stylesheet", async () => {
    cssVars({ colors: { primary: "red", secondary: "blue" } });
    await flush();

    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("--colors-primary: red");
    expect(varsEl?.textContent).toContain("--colors-secondary: blue");

    cssVarsRemove({ colors: { primary: "red", secondary: "blue" } });
    await flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toBe("");
  });

  test("reference counting: vars persist until last reference is removed", async () => {
    cssVars({ theme: { color: "red" } });
    cssVars({ theme: { color: "red" } });
    cssVars({ theme: { color: "red" } });
    await flush();

    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("--theme-color: red");

    cssVarsRemove({ theme: { color: "red" } });
    await flush();
    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("--theme-color: red");

    cssVarsRemove({ theme: { color: "red" } });
    await flush();
    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("--theme-color: red");

    cssVarsRemove({ theme: { color: "red" } });
    await flush();
    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toBe("");
  });

  test("reactive removal disposes the effect", async () => {
    const color = signal("red");
    const vars = { primary: color };

    cssVars(vars);
    await flush();
    expect(document.getElementById("hella-vars")?.textContent).toContain("red");

    cssVarsRemove(vars);

    color("blue");
    await flush();
    const varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).not.toContain("blue");
    expect(varsEl?.textContent ?? "").toBe("");
  });

  test("shared scope: only the removed call's keys disappear", async () => {
    cssVars({ theme: { primary: "red" }, spacing: { small: "8px" } });
    cssVars({ typography: { size: "16px" } });
    await flush();

    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("--theme-primary: red");
    expect(varsEl?.textContent).toContain("--spacing-small: 8px");
    expect(varsEl?.textContent).toContain("--typography-size: 16px");

    cssVarsRemove({ theme: { primary: "red" }, spacing: { small: "8px" } });
    await flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).not.toContain("--theme-primary: red");
    expect(varsEl?.textContent).not.toContain("--spacing-small: 8px");
    expect(varsEl?.textContent).toContain("--typography-size: 16px");
  });

  test("unknown input is a no-op", () => {
    expect(() => {
      cssVarsRemove({ nonexistent: "value" });
    }).not.toThrow();
  });

  test("scoped cssVarsRemove removes from correct scope", async () => {
    cssVars({ theme: { color: "red" } }, { scoped: ".card", prefix: "ui" });
    await flush();

    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain(".card{--ui-theme-color: red;}");

    cssVarsRemove({ theme: { color: "red" } }, { scoped: ".card", prefix: "ui" });
    await flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toBe("");
  });

  test("reactive scoped cssVarsRemove disposes and removes keys", async () => {
    const color = signal("green");
    const vars = { theme: { color } };

    cssVars(vars, { scoped: ".dynamic", prefix: "dyn" });
    await flush();
    expect(document.getElementById("hella-vars")?.textContent).toContain(".dynamic{--dyn-theme-color: green;}");

    cssVarsRemove(vars, { scoped: ".dynamic", prefix: "dyn" });

    color("purple");
    await flush();
    const varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent ?? "").toBe("");
  });

  test("multiple calls to different scopes: removing one scope leaves others intact", async () => {
    cssVars({ primary: "red" }, { scoped: ".comp1" });
    cssVars({ secondary: "blue" }, { scoped: ".comp2" });
    await flush();

    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain(".comp1");
    expect(varsEl?.textContent).toContain(".comp2");

    cssVarsRemove({ primary: "red" }, { scoped: ".comp1" });
    await flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).not.toContain(".comp1");
    expect(varsEl?.textContent).toContain(".comp2");
  });

  test("cssVarsRemove at zero refs removes from cache and registry", () => {
    cssVars({ key: "value" });

    const result1 = cssVars({ key: "value" });
    expect(result1.key).toBe("var(--key)");

    cssVarsRemove({ key: "value" });
    cssVarsRemove({ key: "value" });

    const result2 = cssVars({ key: "value" });
    expect(result2.key).toBe("var(--key)");
  });

  test("reactive refCount: two calls, one remove leaves effect active", async () => {
    const color = signal("red");
    const vars = { primary: color };

    cssVars(vars);
    cssVars(vars);
    await flush();
    expect(document.getElementById("hella-vars")?.textContent).toContain("red");

    cssVarsRemove(vars);
    await flush();
    expect(document.getElementById("hella-vars")?.textContent).toContain("red");

    color("blue");
    await flush();
    expect(document.getElementById("hella-vars")?.textContent).toContain("blue");

    cssVarsRemove(vars);
    await flush();
    expect(document.getElementById("hella-vars")?.textContent ?? "").toBe("");
  });

  describe("input validation", () => {
    test.each([null, undefined, "not-an-object"])("throws on non-object input", (invalid) => {
      // @ts-expect-error - testing invalid input
      expect(() => cssVarsRemove(invalid)).toThrow("[css] cssVarsRemove:");
    });
  });
});
