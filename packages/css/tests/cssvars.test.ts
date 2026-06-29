import { describe, expect, test, beforeEach, mock } from "bun:test";
import { batch, computed, flush, signal } from "@hellajs/core";
import {resetTestState} from "@utils/test-helpers.js";
import { cssVars, resetCss, resetCssVars } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
  resetCss();
  resetCssVars();
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

  test("resetCssVars clears CSS variables", () => {
    const result1 = cssVars({ colors: { primary: 'purple', secondary: 'green' } });
    flush();

    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain('--colors-primary: purple');
    expect(varsEl?.textContent).toContain('--colors-secondary: green');

    resetCssVars();
    flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toBe('');

    const result2 = cssVars({ colors: { primary: 'purple', secondary: 'green' } });
    flush();
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

  test("reactive vars track signal dependencies", () => {
    const primaryColor = signal('red');
    const secondaryColor = signal('blue');

    cssVars({
      colors: {
        primary: primaryColor,
        secondary: secondaryColor
      }
    });

    flush();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toBe(":root{--colors-primary: red;--colors-secondary: blue;}");

    batch(() => {
      primaryColor('green');
      secondaryColor('yellow');
    });

    flush();
    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toBe(":root{--colors-primary: green;--colors-secondary: yellow;}");
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

  test("mixed static and reactive vars", () => {
    const dynamicColor = signal('purple');

    cssVars({
      colors: {
        primary: dynamicColor,    // reactive
        secondary: 'orange',      // static
        accent: 'pink'           // static
      },
      spacing: '8px'            // static
    });

    flush();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain('--colors-primary: purple');
    expect(varsEl?.textContent).toContain('--colors-secondary: orange');
    expect(varsEl?.textContent).toContain('--spacing: 8px');

    dynamicColor('teal');
    flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain('--colors-primary: teal');
    expect(varsEl?.textContent).toContain('--colors-secondary: orange');
  });

  test("nested reactive dependencies", () => {
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

    flush();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain('--theme-background: #333');
    expect(varsEl?.textContent).toContain('--theme-text: #fff');
    expect(varsEl?.textContent).toContain('--typography-size: 20px');

    batch(() => {
      theme('light');
      size('small');
    });

    flush();
    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain('--theme-background: #fff');
    expect(varsEl?.textContent).toContain('--theme-text: #000');
    expect(varsEl?.textContent).toContain('--typography-size: 14px');
  });

  test("resetCssVars clears reactive effects", () => {
    const color = signal('red');
    cssVars({ primary: color });

    flush();
    expect(document.getElementById("hella-vars")?.textContent).toContain('red');

    resetCssVars();

    color('blue');
    flush();
    expect(document.getElementById("hella-vars")?.textContent).toBe('');
  });

  test("computed signal integration", () => {
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

    flush();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toBe(":root{--colors-primary: rgba(255, 0, 0, 0.8);}");

    opacity(0.5);
    flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toBe(":root{--colors-primary: rgba(255, 0, 0, 0.5);}");
  });

  test("multiple cssVars calls accumulate instead of overwriting", () => {
    const vars1 = cssVars({
      theme: {
        primary: "#ff0000",
        secondary: "#00ff00"
      }
    });

    flush();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("--theme-primary: #ff0000");
    expect(varsEl?.textContent).toContain("--theme-secondary: #00ff00");

    const vars2 = cssVars({
      spacing: {
        small: "8px",
        large: "16px"
      }
    });

    flush();
    varsEl = document.getElementById("hella-vars");

    expect(varsEl?.textContent).toContain("--theme-primary: #ff0000");
    expect(varsEl?.textContent).toContain("--theme-secondary: #00ff00");
    expect(varsEl?.textContent).toContain("--spacing-small: 8px");
    expect(varsEl?.textContent).toContain("--spacing-large: 16px");

    expect(vars1.theme.primary).toBe("var(--theme-primary)");
    expect(vars2.spacing.small).toBe("var(--spacing-small)");
  });

  test("multiple reactive cssVars update independently", () => {
    const color1 = signal("red");
    const color2 = signal("blue");

    cssVars({
      theme: { primary: color1 }
    });

    cssVars({
      theme: { secondary: color2 }
    });

    flush();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("--theme-primary: red");
    expect(varsEl?.textContent).toContain("--theme-secondary: blue");

    color1("green");
    flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("--theme-primary: green");
    expect(varsEl?.textContent).toContain("--theme-secondary: blue");

    color2("yellow");
    flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("--theme-primary: green");
    expect(varsEl?.textContent).toContain("--theme-secondary: yellow");

    batch(() => {
      color1("purple");
      color2("orange");
    });
    flush();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain("--theme-primary: purple");
    expect(varsEl?.textContent).toContain("--theme-secondary: orange");
  });

  test("varsEffect cleanup removes individual effect", () => {
    const color = signal("red");
    const tracker = mock(() => color());

    cssVars({
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
    resetCssVars();
    const countAfterReset = tracker.mock.calls.length;
    color("green");
    flush();
    expect(tracker.mock.calls.length).toBe(countAfterReset);
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

  test("empty object returns empty result", () => {
    const result = cssVars({});
    expect(Object.keys(result)).toHaveLength(0);
    flush();
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
