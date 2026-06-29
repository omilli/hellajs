import { describe, expect, test, beforeEach } from "bun:test";
import { batch, flush, signal } from "@hellajs/core";
import {resetTestState} from "@utils/test-helpers.js";
import { css, cssVars, resetCss, resetCssVars, removeCss } from "@hellajs/css/bundle";
import { mount } from "@hellajs/dom/bundle";

beforeEach(() => {
  resetTestState();
  resetCss();
  resetCssVars();
});

describe("css", () => {
  test("global by default returns empty string", () => {
    const result = css({ body: { margin: '0' } });
    expect(result).toBe('');
  });

  test("name option returns the name and scopes to class", () => {
    const result = css({ color: 'red' }, { name: 'card' });
    expect(result).toBe('card');
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.card{color:red}');
  });

  test("complex nested styles with name", () => {
    css({
      '&:hover': { color: 'red' },
      '@media (max-width: 768px)': { fontSize: '12px' }
    }, { name: 'btn' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.btn:hover{color:red}');
    expect(content).toContain('@media (max-width: 768px){');
    expect(content).toContain('.btn{font-size:12px}');
  });

  test("null/undefined values ignored", () => {
    css({
      color: 'blue',
      fontSize: undefined,
      margin: '0'
    }, { name: 'test' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('color:blue');
    expect(content).not.toContain('font-size');
  });

  test("null values in nested selectors ignored", () => {
    css({
      color: 'red',
      '&:hover': { color: 'blue', fontSize: null as unknown as undefined },
    }, { name: 'test' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('color:red');
    expect(content).toContain(':hover{color:blue}');
    expect(content).not.toContain('font-size');
  });

  test("cache reuse with same name", () => {
    const styles = { color: 'red' };
    const options = { name: 'cached' };

    const result1 = css(styles, options);
    const result2 = css(styles, options);

    expect(result1).toBe(result2);
    expect(result1).toBe('cached');
  });

  test("removes styles", () => {
    const styles = { color: 'blue' };
    css(styles, { name: 'test' });
    removeCss(styles, { name: 'test' });

    const styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).not.toContain('color:blue');
  });

  test("removeCss preserves styles until all references gone", () => {
    const styles = { color: 'purple' };

    css(styles, { name: 'test' });
    css(styles, { name: 'test' });
    css(styles, { name: 'test' });

    removeCss(styles, { name: 'test' });
    expect(document.getElementById('hella-css')?.textContent).toContain('color:purple');

    removeCss(styles, { name: 'test' });
    expect(document.getElementById('hella-css')?.textContent).toContain('color:purple');

    removeCss(styles, { name: 'test' });
    expect(document.getElementById('hella-css')?.textContent).not.toContain('color:purple');

    css(styles, { name: 'test' });
    expect(document.getElementById('hella-css')?.textContent).toContain('color:purple');
  });

  test("removeCss is a no-op for unknown styles", () => {
    removeCss({ color: 'neveradded' });
    const el = document.getElementById('hella-css');
    expect(el === null || el.textContent === '').toBe(true);
  });

  test("resetCss clears CSS rules", () => {
    css({ color: 'red', fontSize: '16px' }, { name: 'test' });

    let styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).toContain('color:red');
    expect(styleEl?.textContent).toContain('font-size:16px');

    resetCss();

    styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).toBe('');
  });

  test("number values in CSS properties", () => {
    css({ zIndex: 10, opacity: 0.5, lineHeight: 1.5 }, { name: 'test' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('z-index:10');
    expect(content).toContain('opacity:0.5');
    expect(content).toContain('line-height:1.5');
  });

  test("multiple & in selector are all replaced", () => {
    css({
      color: 'black',
      '&&:hover': { color: 'red' }
    }, { name: 'test' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.test.test:hover{color:red}');
  });

  test("scoped name composes descendant selectors", () => {
    css({
      color: 'black',
      '.child': { color: 'red' },
      'span': { display: 'inline' }
    }, { name: 'parent' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.parent{color:black}');
    expect(content).toContain('.parent .child{color:red}');
    expect(content).toContain('.parent span{display:inline}');
  });

  test("removeCss with global styles", () => {
    const styles = { body: { margin: '0' } };
    css(styles);
    expect(document.getElementById('hella-css')?.textContent).toContain('margin:0');

    removeCss(styles);
    expect(document.getElementById('hella-css')?.textContent).toBe('');
  });

  test("array values join with commas", () => {
    css({
      fontFamily: ['Helvetica', 'Arial', 'sans-serif'],
      transition: ['color 0.2s', 'background 0.3s']
    }, { name: 'test' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('font-family:Helvetica, Arial, sans-serif');
    expect(content).toContain('transition:color 0.2s, background 0.3s');
  });

  test("multiple global styles accumulate", () => {
    css({ body: { margin: '0' } });
    css({ '*': { boxSizing: 'border-box' } });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('body{margin:0}');
    expect(content).toContain('*{box-sizing:border-box}');
  });

  test("style element reuse when already in DOM", () => {
    const beforeCount = document.querySelectorAll('#hella-css').length;

    css({ color: 'green' }, { name: 'test' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('color:green');

    expect(document.querySelectorAll('#hella-css').length).toBe(beforeCount + 1);
  });

  test("reactive integration", () => {
    const colorSignal = signal("red");
    const sizeSignal = signal("16px");

    const vars = cssVars({
      colors: { primary: colorSignal },
      font: { size: sizeSignal }
    });

    const className = css({
      color: vars.colors.primary,
      fontSize: vars.font.size
    }, { name: 'themed' });

    mount({
      tag: 'div',
      props: { class: className },
      children: ['Hello World']
    });

    expect(document.body.innerHTML).toContain(`<div class="themed">Hello World</div>`);

    batch(() => {
      colorSignal("blue");
      sizeSignal("20px");
    });

    expect(document.body.innerHTML).toContain(`<div class="themed">Hello World</div>`);
    flush();

    const varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toBe(":root{--colors-primary: blue;--font-size: 20px;}");
  });

  test("content property auto-quotes string values", () => {
    css({
      content: 'Hello World',
      '&::before': {
        content: 'Before text'
      },
      '&::after': {
        content: '"Already quoted"'
      }
    }, { name: 'test' });
    const styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).toContain('content:"Hello World"');
    expect(styleEl?.textContent).toContain('content:"Before text"');
    expect(styleEl?.textContent).toContain('content:"Already quoted"');
  });

  test("content property preserves single-quoted values", () => {
    css({
      '&::before': { content: "'single'" }
    }, { name: 'test' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain("content:'single'");
  });

  test("global with selector keys", () => {
    css({
      '.card': { padding: '1rem' },
      '.card-title': { fontSize: '1.25rem' },
    });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.card{padding:1rem}');
    expect(content).toContain('.card-title{font-size:1.25rem}');
  });

  test("multiple named rules appear as independent rules", () => {
    css({ color: 'red' }, { name: 'card' });
    css({ fontSize: '16px' }, { name: 'heading' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.card{color:red}');
    expect(content).toContain('.heading{font-size:16px}');
  });

  describe("input validation", () => {
    test.each([null, undefined, "not-an-object", 42])("css throws on non-object input", (invalid) => {
      // @ts-expect-error - testing invalid input
      expect(() => css(invalid)).toThrow("[css] css:");
    });

    test.each([null, undefined, "not-an-object"])("removeCss throws on non-object input", (invalid) => {
      // @ts-expect-error - testing invalid input
      expect(() => removeCss(invalid)).toThrow("[css] removeCss:");
    });
  });
});
