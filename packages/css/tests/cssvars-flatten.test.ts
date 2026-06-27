import { describe, expect, test, beforeEach } from "bun:test";
import {resetTestState} from "../../../utils/test-helpers.js";
import { cssVars, resetCss, resetCssVars } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
  resetCss();
  resetCssVars();
});

describe("cssVars flatten", () => {
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
