import { beforeEach, expect, test } from 'bun:test';
import { css, cssReset } from "../packages/dom/dist/hella-dom.esm";

function getStyleSheetContent() {
  // Find the <style data-css-in-js> element
  const style = document.querySelector('style[data-css-in-js]');
  return style ? style.textContent : '';
}

beforeEach(() => cssReset());

test('basic property', () => {
  const className = css({ color: "red" });
  const cssText = getStyleSheetContent();
  expect(cssText).toContain(`.${className}{color:red;}`);
});

test('nested selectors', () => {
  const className = css({
    color: "red",
    ":hover": { color: "blue" },
    $span: { color: "green" },
    "&.foo, &.bar": { color: "purple" }
  });
  const cssText = getStyleSheetContent();
  expect(cssText).toContain(`.${className}{color:red;}`);
  expect(cssText).toContain(`.${className}:hover{color:blue;}`);
  expect(cssText).toContain(`.${className} span{color:green;}`);
  expect(cssText).toContain(`.${className}.foo{color:purple;}`);
  expect(cssText).toContain(`.${className}.bar{color:purple;}`);
});

test('media queries', () => {
  const className = css({
    color: "red",
    "@media (max-width: 600px)": { color: "blue" }
  });
  const cssText = getStyleSheetContent();
  expect(cssText).toContain(`.${className}{color:red;}`);
  expect(cssText).toContain(`@media (max-width: 600px){.${className}{color:blue;}}`);
});

test('css variables', () => {
  const className = css({
    "--main-color": "red",
    color: "var(--main-color)"
  });
  const cssText = getStyleSheetContent();
  expect(cssText).toContain(`.${className}{--main-color:red;color:var(--main-color);}`);
});

test('keyframes', () => {
  const className = css({
    "@keyframes fade": {
      from: { opacity: 0 },
      to: { opacity: 1 }
    },
    animation: "fade 1s"
  });
  const cssText = getStyleSheetContent();
  expect(cssText).toContain(`@keyframes fade{from{opacity:0;}to{opacity:1;}}`);
  expect(cssText).toContain(`.${className}{animation:fade 1s;}`);
});

test('global styles', () => {
  css({ body: { margin: 0 } }, { global: true });
  const cssText = getStyleSheetContent();
  expect(cssText).toContain(`body{margin:0;}`);
});

test('deduplication', () => {
  const a = css({ color: "red" });
  const b = css({ color: "red" });
  expect(a).toBe(b);
});

test('scoped', () => {
  const className = css({ color: "red" }, { scoped: "foo" });
  const cssText = getStyleSheetContent();
  expect(cssText).toContain(`.foo .${className}{color:red;}`);
});

test('named', () => {
  const className = css({ color: "red" }, { name: "foo" });
  const cssText = getStyleSheetContent();
  expect(className).toBe("foo");
  expect(cssText).toContain(`.foo{color:red;}`);
});

test('inline deduplication', () => {
  const a = css({ color: "red" });
  const b = css({ color: "red" });
  expect(a).toBe(b);
});

test('multiple selectors', () => {
  const className = css({
    color: "red",
    ":hover, :focus": { color: "blue" }
  });
  const cssText = getStyleSheetContent();
  expect(cssText).toContain(`.${className}{color:red;}`);
  expect(cssText).toContain(`.${className}:hover{color:blue;}`);
  expect(cssText).toContain(`.${className}:focus{color:blue;}`);
});

test('css var usage', () => {
  const className = css({
    "--foo": "bar",
    color: "var(--foo)"
  });
  const cssText = getStyleSheetContent();
  expect(cssText).toContain(`.${className}{--foo:bar;color:var(--foo);}`);
});

test('removal', () => {
  const obj = { color: "red" };
  const className = css(obj);
  const before = getStyleSheetContent();
  expect(before).toContain(`.${className}{color:red;}`);
  css.remove(obj);
  const after = getStyleSheetContent();
  expect(after).not.toContain(`.${className}{color:red;}`);
  expect(document.querySelector('style[data-css-in-js]')).toBeNull();
});
