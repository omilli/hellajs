import { describe, expect, test } from 'bun:test';
import { css, cssReset, cssVars, cssVarsReset } from "../packages/css/dist/css.js";

function getStyle() {
  return document.querySelector('style[hella-css]')?.textContent || '';
}

function getVars() {
  return document.querySelector('style[hella-vars]')?.textContent || '';
}

describe("css", () => {
  test('should apply basic property', () => {
    const className = css({ color: "red" });
    const cssText = getStyle();
    expect(cssText).toContain(`.${className}{color:red;}`);
  });

  test('should handle nested selectors', () => {
    const className = css({
      color: "red",
      ":hover": { color: "blue" },
      span: { color: "green" },
      "&.foo, &.bar": { color: "purple" }
    });
    const cssText = getStyle();
    expect(cssText).toContain(`.${className}{color:red;}`);
    expect(cssText).toContain(`.${className}:hover{color:blue;}`);
    expect(cssText).toContain(`.${className} span{color:green;}`);
    expect(cssText).toContain(`.${className}.foo{color:purple;}`);
    expect(cssText).toContain(`.${className}.bar{color:purple;}`);
  });

  test('should support media queries', () => {
    const className = css({
      color: "red",
      "@media (max-width: 600px)": { color: "blue" }
    });
    const cssText = getStyle();
    expect(cssText).toContain(`.${className}{color:red;}`);
    expect(cssText).toContain(`@media (max-width: 600px){.${className}{color:blue;}}`);
  });

  test('should support css variables', () => {
    const className = css({
      "--main-color": "red",
      color: "var(--main-color)"
    });
    const cssText = getStyle();
    expect(cssText).toContain(`.${className}{--main-color:red;color:var(--main-color);}`);
  });

  test('should support keyframes', () => {
    const className = css({
      "@keyframes fade": {
        from: { opacity: 0 },
        to: { opacity: 1 }
      },
      animation: "fade 1s"
    });
    const cssText = getStyle();
    expect(cssText).toContain(`@keyframes fade{from{opacity:0;}to{opacity:1;}}`);
    expect(cssText).toContain(`.${className}{animation:fade 1s;}`);
  });

  test('should support global styles', () => {
    css({ body: { margin: 0 } }, { global: true });
    const cssText = getStyle();
    expect(cssText).toContain(`body{margin:0;}`);
  });

  test('should deduplicate identical rules', () => {
    const a = css({ color: "red" });
    const b = css({ color: "red" });
    expect(a).toBe(b);
  });

  test('should support scoped selectors', () => {
    const className = css({ color: "red" }, { scoped: "foo" });
    const cssText = getStyle();
    expect(cssText).toContain(`.foo .${className}{color:red;}`);
  });

  test('should support named classes', () => {
    const className = css({ color: "red" }, { name: "foo" });
    const cssText = getStyle();
    expect(className).toBe("foo");
    expect(cssText).toContain(`.foo{color:red;}`);
  });

  test('should deduplicate inline identical rules', () => {
    const a = css({ color: "red" });
    const b = css({ color: "red" });
    expect(a).toBe(b);
  });

  test('should support multiple selectors', () => {
    const className = css({
      color: "red",
      ":hover, :focus": { color: "blue" }
    });
    const cssText = getStyle();
    expect(cssText).toContain(`.${className}{color:red;}`);
    expect(cssText).toContain(`.${className}:hover{color:blue;}`);
    expect(cssText).toContain(`.${className}:focus{color:blue;}`);
  });

  test("Remove on non-existent rule does not throw", () => {
    expect(() => {
      css.remove({ color: "not-in-cache" });
    }).not.toThrow();
  });

  test("should hit the css cache path and update refCounts/inlineMemo", () => {
    const obj = { color: "limegreen" };
    const first = css(obj);
    const second = css(obj);
    expect(second).toBe(first);
    const third = css(obj);
    expect(third).toBe(first);
  });

  test("should return from inlineMemo if cache is cleared but input is the same", () => {
    const obj = { color: "deeppink" };
    const className = css(obj);
    css.remove(obj);
    const result = css(obj);
    expect(result).toBe(className);
  });
});

describe("cssVars", () => {
  test('should support css var usage', () => {
    const className = css({
      "--foo": "bar",
      color: "var(--foo)"
    });
    const cssText = getStyle();
    expect(cssText).toContain(`.${className}{--foo:bar;color:var(--foo);}`);
  });

  test('should remove styles after cssReset', () => {
    cssReset();
    const obj = { color: "red" };
    const className = css(obj);
    css.remove(obj);
    const after = getStyle();
    expect(after).not.toContain(`.${className}{color:red;}`);
    expect(document.querySelector('style[hella-css]')).toBeNull();
  });

  test('should inject variables into :root', () => {
    cssVars({ foo: '#123abc', bar: 42 });
    const cssText = getVars();
    expect(cssText?.trim().startsWith(':root')).toBe(true);
    expect(cssText).toContain(':root {');
    expect(cssText).toContain('--foo: #123abc;');
    expect(cssText).toContain('--bar: 42;');
  });

  test('should overwrite previous :root block', () => {
    cssVars({ foo: 'red' });
    let cssText = getVars();
    expect(cssText).toContain('--foo: red;');
    cssVars({ bar: 'blue' });
    cssText = getVars();
    expect(cssText).not.toContain('--foo: red;');
    expect(cssText).toContain('--bar: blue;');
  });

  test('should return var() references for each key', () => {
    const myVars = cssVars({ foo: 'red', bar: 123 });
    expect(myVars.foo).toBe('var(--foo)');
    expect(myVars.bar).toBe('var(--bar)');
  });

  test('should support nested objects and flatten keys', () => {
    const vars = cssVars({
      foo: {
        bar: 1,
        buzz: 2
      },
      top: 3
    });
    const cssText = getVars();
    expect(cssText).toContain('--foo-bar: 1;');
    expect(cssText).toContain('--foo-buzz: 2;');
    expect(cssText).toContain('--top: 3;');
    expect(vars['foo-bar']).toBe('var(--foo-bar)');
    expect(vars['foo-buzz']).toBe('var(--foo-buzz)');
    expect(vars.top).toBe('var(--top)');
  });

  test("removes the vars style element", () => {
    cssVars({ foo: "bar" });
    expect(document.querySelector('style[hella-vars]')).not.toBeNull();
    cssVarsReset();
    expect(document.querySelector('style[hella-vars]')).toBeNull();
  });

  test("empty object returns empty object", () => {
    const vars = cssVars({});
    expect(vars).toEqual({});
  });

  test("nested and flat keys", () => {
    const vars = cssVars({ foo: { bar: 1 }, fooBar: 2 });
    const cssText = document.querySelector('style[hella-vars]')?.textContent || '';
    expect(cssText).toContain('--foo-bar: 1;');
    expect(cssText).toContain('--fooBar: 2;');
    expect(vars['foo-bar']).toBe('var(--foo-bar)');
    expect(vars['fooBar']).toBe('var(--fooBar)');
  });
});
