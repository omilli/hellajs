import { describe, expect, test, afterEach } from 'bun:test';
import { css, cssReset, cssVars, cssVarsReset } from "../packages/css";

afterEach(() => {
  cssReset();
  cssVarsReset();
});

describe("css utility", () => {
  test('should return a class name for a style object', () => {
    const className = css({ color: "red" });
    expect(typeof className).toBe("string");
    expect(className.length).toBeGreaterThan(0);
  });

  test('should return the same class name for identical style objects', () => {
    const a = css({ color: "red" });
    const b = css({ color: "red" });
    expect(a).toBe(b);
  });

  test('should allow named classes', () => {
    const className = css({ color: "red" }, { name: "foo" });
    expect(className).toBe("foo");
  });

  test('should allow removing a style without error', () => {
    expect(() => css.remove({ color: "not-in-cache" })).not.toThrow();
  });

  test('should allow removing and re-adding a style', () => {
    const obj = { color: "deeppink" };
    const className = css(obj);
    css.remove(obj);
    const result = css(obj);
    expect(result).toBe(className);
  });

  test('should support scoped selectors', () => {
    const className = css({ color: "red" }, { scoped: "foo" });
    expect(typeof className).toBe("string");
  });

  test('should support css variables', () => {
    const className = css({ "--main-color": "red", color: "var(--main-color)" });
    expect(typeof className).toBe("string");
  });

  test('should support keyframes', () => {
    const className = css({
      "@keyframes fade": {
        from: { opacity: 0 },
        to: { opacity: 1 }
      },
      animation: "fade 1s"
    });
    expect(typeof className).toBe("string");
  });

  test('should support global styles', () => {
    const className = css({ body: { margin: 0 } }, { global: true });
    expect(typeof className).toBe("string");
  });
});

describe("cssVars for theming", () => {
  test('should return var() references for each key', () => {
    const vars = cssVars({ foo: 'red', bar: 123 });
    expect(vars.foo).toBe('var(--foo)');
    expect(vars.bar).toBe('var(--bar)');
  });

  test('should flatten nested objects and flatten keys', () => {
    const vars = cssVars({
      foo: {
        bar: 1,
        buzz: 2
      },
      top: 3
    });
    expect(vars['foo-bar']).toBe('var(--foo-bar)');
    expect(vars['foo-buzz']).toBe('var(--foo-buzz)');
    expect(vars.top).toBe('var(--top)');
  });

  test('should return an empty object for empty input', () => {
    const vars = cssVars({});
    expect(vars).toEqual({});
  });
});
