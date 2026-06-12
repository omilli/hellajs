import { describe, expect, test, beforeEach } from "bun:test";
import { cssVars, cssReset, cssVarsReset } from "@hellajs/css/bundle";

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
    cssVars({ colors: { primary: 'purple', secondary: 'green' } });
    await flush();

    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain('--colors-primary: purple');
    expect(varsEl?.textContent).toContain('--colors-secondary: green');

    cssVarsReset();
    await flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toBe('');
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

  test("cache eviction at 100 entries", () => {
    for (let i = 0; i < 100; i++) {
      cssVars({ [`key${i}`]: `value${i}` });
    }

    const result = cssVars({ overflow: 'evicted' });
    expect(result.overflow).toBe('var(--overflow)');

    const result2 = cssVars({ fresh: 'entry' });
    expect(result2.fresh).toBe('var(--fresh)');
  });

  test("empty object returns empty result", async () => {
    const result = cssVars({});
    expect(Object.keys(result)).toHaveLength(0);
    await flush();
    const varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent ?? '').toBe('');
  });

});
