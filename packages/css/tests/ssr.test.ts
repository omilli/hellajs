import { describe, test, expect, afterEach } from "bun:test";
import { css, cssVars, cssReset, cssVarsReset } from "@hellajs/css/bundle";

let origDocument: unknown;

afterEach(() => {
  (globalThis as unknown as Record<string, unknown>).document = origDocument;
  cssReset();
  cssVarsReset();
});

describe("SSR safety", () => {
  test("css() returns class name without DOM write when document is undefined", () => {
    origDocument = globalThis.document;
    (globalThis as unknown as Record<string, unknown>).document = undefined;

    const result = css({ color: 'red' }, { name: 'x' });
    expect(result).toBe('x');
  });

  test("css() returns empty string for global styles without DOM write", () => {
    origDocument = globalThis.document;
    (globalThis as unknown as Record<string, unknown>).document = undefined;

    const result = css({ body: { margin: '0' } });
    expect(result).toBe('');
  });

  test("cssVars() returns proxy without DOM write", () => {
    origDocument = globalThis.document;
    (globalThis as unknown as Record<string, unknown>).document = undefined;

    const vars = cssVars({ colors: { primary: 'red' } });
    expect(vars.colors.primary).toBe('var(--colors-primary)');
  });

  test("cssVars() with reactive signals returns proxy without DOM write", () => {
    origDocument = globalThis.document;
    (globalThis as unknown as Record<string, unknown>).document = undefined;

    const color = signal('red');
    const vars = cssVars({ colors: { primary: color } });
    expect(vars.colors.primary).toBe('var(--colors-primary)');
  });

  test("cssReset() does not throw", () => {
    origDocument = globalThis.document;
    (globalThis as unknown as Record<string, unknown>).document = undefined;

    expect(() => cssReset()).not.toThrow();
  });

  test("cssVarsReset() does not throw", () => {
    origDocument = globalThis.document;
    (globalThis as unknown as Record<string, unknown>).document = undefined;

    expect(() => cssVarsReset()).not.toThrow();
  });

  test("cssVars() with scoped option returns proxy without DOM write", () => {
    origDocument = globalThis.document;
    (globalThis as unknown as Record<string, unknown>).document = undefined;

    const vars = cssVars({ theme: { color: 'blue' } }, { scoped: '.card' });
    expect(vars.theme.color).toBe('var(--theme-color)');
  });
});
